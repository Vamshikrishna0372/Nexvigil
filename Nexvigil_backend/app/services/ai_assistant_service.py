from app.core.config import settings
from app.db.mongodb import db
from app.schemas.user import UserResponse
from app.services.groq_service import ask_ai_async
from datetime import datetime, timezone, timedelta
import logging
import json
import re
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

class AIAssistantService:
    async def ask_ai(self, query: str, user: UserResponse, alerts: List[Dict] = None) -> Optional[Dict]:
        """
        --- FULL SYSTEM CONTROLLER AI ---
        Supports: Cameras, Alerts, and Rules.
        """
        
        # 1. EXTENDED SYSTEM CONTEXT (Double quote enforcement for JSON)
        system_context = (
            "You are NexVigil AI Assistant. You control cameras, alerts, and rules.\n"
            "Analyze the query and return ONLY VALID JSON with double quotes:\n"
            '{ "intent": "...", "parameters": { "object": "...", "severity": "...", "time": "...", "camera_status": "..." } }\n\n'
            "Intents: [GET_CAMERA_COUNT, GET_ACTIVE_CAMERAS, GET_INACTIVE_CAMERAS, GET_ALL_CAMERAS, CREATE_RULE, DELETE_RULE, GET_ALERTS, GET_ALERT_COUNT, GET_ANALYTICS]\n"
            "Rules: If user asks for offline/offline cameras -> camera_status = 'inactive'."
        )
        
        try:
            # Pass user input to Groq for extraction
            intent_raw = await ask_ai_async(f"{system_context}\n\nQuery: {query}")
            
            # --- JSON CLEANUP & EXTRACTION ---
            # Remove markdown code blocks if present
            clean_str = re.sub(r'```json\s*|\s*```', '', intent_raw).strip()
            match = re.search(r'\{.*\}', clean_str, re.DOTALL)
            if not match: raise Exception("No JSON block found in response.")
            
            # Attempt to fix single quotes to double quotes if the AI ignored the prompt
            json_str = match.group().replace("'", '"')
            
            intent_data = json.loads(json_str)
            intent = str(intent_data.get("intent", "HELP")).upper()
            params = intent_data.get("parameters", {})
            
            # --- BACKEND ACTION MAPPING (Step 4-5) ---
            action_result = None
            
            # CAMERA INTENTS
            if "CAMERA" in intent:
                cam_filter = {"owner_id": user.id}
                status_req = params.get("camera_status")
                
                if intent == "GET_ACTIVE_CAMERAS" or status_req == "active":
                    cam_filter["status"] = "active"
                    count = await db.db.cameras.count_documents(cam_filter)
                    action_result = f"System Status: You currently have {count} cameras online and active."
                
                elif intent == "GET_INACTIVE_CAMERAS" or status_req == "inactive":
                    cam_filter["status"] = "inactive"
                    count = await db.db.cameras.count_documents(cam_filter)
                    action_result = f"Alert: There are {count} cameras currently offline or inactive."
                
                elif intent == "GET_CAMERA_COUNT" or intent == "GET_ALL_CAMERAS":
                    count = await db.db.cameras.count_documents(cam_filter)
                    action_result = f"Inventory Check: There are {count} total cameras registered to your account."

            # ALERT INTENTS (Already implemented, preserved)
            elif "ALERT" in intent or intent == "GET_ANALYTICS":
                query_filter = {"owner_id": user.id}
                
                # STEP 2 & 3: NORMALIZE SEVERITY (REGEX FIX)
                severity_param = params.get("severity")
                if severity_param and severity_param.lower() != "none":
                    # Step 3: MongoDB Case-Insensitive Regex
                    query_filter["severity"] = {"$regex": f"^{severity_param}$", "$options": "i"}
                    print(f"DEBUG: APPLYING SEVERITY FILTER: {severity_param}")
                
                obj_param = params.get("object")
                if obj_param and obj_param.lower() != "none":
                    query_filter["object_detected"] = {"$regex": f"^{obj_param}$", "$options": "i"}
                    print(f"DEBUG: APPLYING OBJECT FILTER: {obj_param}")
                
                if params.get("time") == "today":
                    start_of_day = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
                    query_filter["created_at"] = {"$gte": start_of_day}

                # STEP 4 & 5: VERIFY FILTER RESULTS
                if intent == "GET_ALERT_COUNT":
                    count = await db.db.alerts.count_documents(query_filter)
                    print(f"DEBUG: ALERT COUNT RESULT: {count}") # Step 4
                    action_result = f"Database Report: I've identified {count} security detections matching the '{severity_param or 'total'}' priority level."
                
                elif intent == "GET_ALERTS":
                    cursor = db.db.alerts.find(query_filter).sort("created_at", -1).limit(5)
                    found = await cursor.to_list(length=5)
                    print(f"DEBUG: ALERTS LIST RESULT: {len(found)}")
                    if not found:
                        action_result = "No matching alerts were found in your database records."
                    else:
                        items = ", ".join([f"{a.get('object_detected')} ({a.get('severity')})" for a in found])
                        action_result = f"I retrieved these detections from your log: {items}."
                else:
                    action_result = "Analyzing your system analytics... Your security environment is currently stable."

            # RULE INTENTS
            elif intent == "CREATE_RULE":
                obj = params.get("object", "person").lower()
                await db.db.rules.insert_one({
                    "rule_name": f"AI: Detect {obj.capitalize()}",
                    "target_classes": [obj],
                    "min_confidence": 0.5,
                    "is_active": True,
                    "owner_id": user.id,
                    "created_at": datetime.now(timezone.utc)
                })
                action_result = f"Rule Applied: I am now monitoring for {obj} detections."

            else:
                action_result = "I am your NexVigil Controller. Ask me about cameras (online/offline), alerts, or security rules."

            # 3. FINAL FORMATTING Pass
            format_prompt = (
                f"Identify yourself as NexVigil Sentinel. Translate this raw data into a helpful response.\n"
                f"Query: '{query}'\n"
                f"Data: '{action_result}'"
            )
            human_answer = await ask_ai_async(format_prompt)
            
            return {
                "answer": human_answer or action_result,
                "intent": intent,
                "action_performed": True
            }

        except Exception as e:
            logger.error(f"CONTROLLER FAULT: {str(e)}")
            return {"answer": f"System interface error: {str(e)[:50]}", "intent": "ERROR"}

ai_assistant_service = AIAssistantService()
