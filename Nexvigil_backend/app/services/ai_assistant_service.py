from app.core.config import settings
from app.db.mongodb import db
from app.schemas.user import UserResponse
from app.services.groq_service import ask_ai_async
from app.services.camera_service import camera_service
from app.services.alert_service import alert_service
from app.services.rule_service import rule_service
from app.schemas.camera import CameraUpdate, CameraCreate
from datetime import datetime, timezone, timedelta
import logging
import json
import re
import asyncio
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

class AIAssistantService:
    def _match_intent_manually(self, query: str):
        """Standard regex matcher as a safety net when AI fails."""
        q = query.lower()
        if "camera" in q and ("how many" in q or "count" in q or "status" in q):
            return "GET_CAMERA_COUNT", {}
        if "alert" in q and ("how many" in q or "count" in q):
            params = {}
            if "today" in q: params["time"] = "today"
            if "critical" in q: params["severity"] = "critical"
            return "GET_ALERT_COUNT", params
        if "what is my name" in q or "my profile" in q or "who am i" in q:
            return "GET_USER_INFO", {}
        if "rule" in q and ("what" in q or "show" in q or "list" in q):
            return "GET_RULES", {}
        return "HELP", {}

    async def ask_ai(self, query: str, user: UserResponse, recent_alerts: List[Dict] = None, history: List[Dict] = []) -> Optional[Dict]:
        """
        --- 100% DATA-DRIVEN INTERACTIVE NEXVIGIL AI CONTROLLER ---
        Stops hallucinations by fetching DB data BEFORE generating answers.
        """
        
    async def _fetch_ground_truth(self, user: UserResponse):
        """Fetch all necessary data with 1 retry attempt if it fails."""
        for attempt in range(2):
            try:
                print(f"DEBUG: Fetching Ground Truth (Attempt {attempt+1}) for User: {user.id}")
                
                # Fetching in parallel for speed
                
                tasks = [
                    camera_service.get_cameras(user, limit=100),
                    alert_service.get_summary(user),
                    rule_service.get_rules(user.id)
                ]
                
                results = await asyncio.gather(*tasks)
                cameras, alert_summary, active_rules = results
                
                cam_total = len(cameras)
                cam_online = len([c for c in cameras if str(c.status).lower() in ["active", "online", "active_session"]])
                cam_offline = len([c for c in cameras if str(c.status).lower() in ["inactive", "offline", "disconnected"]])
                
                print(f"DEBUG: Data Fetched - Cams: {cam_total}, Alerts: {alert_summary.total_alerts}, Rules: {len(active_rules)}")
                
                # USE SAFE ATTRIBUTES TO PREVENT ATTRIBUTE-ERRORS (CRITICAL)
                name_attr = getattr(user, "name", getattr(user, "full_name", "Valued User"))
                
                return (
                    f"SYSTEM DATA (GROUND TRUTH):\n"
                    f"- User Profile: Name: {name_attr}, Email: {user.email}\n"
                    f"- Total Cameras: {cam_total}\n"
                    f"- Online Cameras: {cam_online}\n"
                    f"- Offline/Inactive Cameras: {cam_offline}\n"
                    f"- Total Alerts Recorded (All-time): {alert_summary.total_alerts}\n"
                    f"- Recorded Alerts Today: {alert_summary.today}\n"
                    f"- Critical Alerts Today: {alert_summary.critical}\n"
                    f"- Active Cameras List: {', '.join([c.camera_name for c in cameras])}\n"
                    f"- Configured Detection Rules: {', '.join([r.get('rule_name', 'Unnamed') for r in active_rules])}\n"
                ), cameras, alert_summary, active_rules
                
            except Exception as e:
                logger.error(f"Ground Truth Fetch Error (Attempt {attempt+1}): {e}")
                if attempt == 1: # Last attempt
                    return "SYSTEM DATA: [Database Unavailable - Do NOT generate any numbers or user data]", [], None, []
                await asyncio.sleep(1) # Wait before retry
                
    async def ask_ai(self, query: str, user: UserResponse, recent_alerts: List[Dict] = None, history: List[Dict] = []) -> Optional[Dict]:
        """
        --- 100% DATA-DRIVEN INTERACTIVE NEXVIGIL AI CONTROLLER ---
        Stops hallucinations by fetching DB data BEFORE generating answers.
        """
        
        # --- PHASE 0: DATA PRE-FETCH WITH RETRY ---
        real_data_context, cameras, alert_summary, active_rules = await self._fetch_ground_truth(user)

        # 1. ENHANCED SYSTEM ROLE
        system_role = (
            "You are the NexVigil AI Controller, a professional system operator.\n"
            "CRITICAL RULE: You must ONLY use the provided 'SYSTEM DATA'.\n"
            "NEVER generate, guess, or assume any numbers (counts, statuses, etc.).\n"
            "If the user asks for a count or status not in the data, say 'I cannot retrieve that information right now.'\n\n"
            f"{real_data_context}\n"
            "AVAILABLE SYSTEM ACTIONS:\n"
            "- Add/Delete/Toggle Cameras\n"
            "- Filter/Count Alerts\n"
            "- Create Detection Rules\n\n"
            "RETURN ONLY VALID JSON:\n"
            "{\n"
            '  "intent": "[GET_CAMERA_COUNT, GET_CAMERA_STATUS, ADD_CAMERA, DELETE_CAMERA, TURN_OFF_CAMERA, TURN_ON_CAMERA, GET_ALERTS, GET_ALERT_COUNT, GET_USER_INFO, GET_RULES, CREATE_RULE, CONFIRM_ACTION, PROVIDE_INFO, HELP]",\n'
            '  "parameters": { "target": "...", "id": "...", "camera_name": "...", "camera_url": "...", "severity": "...", "object": "...", "time": "today/none" },\n'
            '  "reason": "Internal reasoning for intent selection"\n'
            "}\n"
        )
        
        try:
            # --- PHASE A: INTENT & PARAMETER EXTRACTION ---
            history_context = "\n".join([f"{h.get('role', 'user').upper()}: {h.get('content', '')}" for h in history[-5:]])
            full_prompt = (
                f"{system_role}\n\n"
                f"Recent History:\n{history_context}\n\n"
                f"User Query: {query}\n\n"
                "Decision: Identify the user's intent and extract parameters using ONLY real data."
            )
            try:
                raw_response = await ask_ai_async(full_prompt)
                
                clean_json = re.sub(r'```json\s*|\s*```', '', raw_response).strip()
                match = re.search(r'\{.*\}', clean_json, re.DOTALL)
                
                if match:
                    intent_data = json.loads(match.group())
                    intent = intent_data.get("intent", "HELP").upper()
                    params = intent_data.get("parameters", {})
                else:
                    # FALLBACK: Manual Regex Matching if AI output is nonsensical
                    print(f"DEBUG: AI Output was not JSON. Falling back to Manual Regex.")
                    intent, params = self._match_intent_manually(query)
            except Exception as e:
                print(f"DEBUG: AI Call Failed ({str(e)}). Falling back to Manual Regex.")
                intent, params = self._match_intent_manually(query)
            
            # Clean parameters
            if params:
                for k, v in list(params.items()):
                    if not v or str(v).lower() in ["unknown", "none", "null", "undefined"]:
                        params[k] = None
            else:
                params = {}

            # --- PHASE B: EXECUTION ---

            # 1. ADD CAMERA
            if intent == "ADD_CAMERA":
                name = params.get("camera_name") or params.get("target")
                url = params.get("camera_url")
                if not name or not url:
                    return {"answer": "To add a new camera, please provide the name and the RTSP/HTTP Stream URL.", "intent": "PROVIDE_INFO"}
                try:
                    await camera_service.create_camera(CameraCreate(camera_name=name, camera_url=url, location="Main"), user)
                    return {"answer": f"Success. Camera '{name}' has been added to the system.", "intent": "ADD_CAMERA", "status": "success"}
                except Exception as e:
                    return {"answer": f"Unable to add camera: {str(e)}", "intent": "ADD_CAMERA", "status": "error"}

            # 2. DELETE/CONTROL (VALIDATE AGAINST REAL DATA)
            elif intent in ["DELETE_CAMERA", "TURN_OFF_CAMERA", "TURN_ON_CAMERA"]:
                target = params.get("target") or params.get("id") or params.get("camera_name")
                if not target:
                    return {"answer": "Please specify the name of the camera you would like to manage.", "intent": "PROVIDE_INFO"}
                
                # Check against fetched cameras (Ground Truth)
                camera_obj = next((c for c in cameras if c.camera_name.lower() == str(target).lower() or str(c.id) == str(target)), None)
                if not camera_obj:
                    # AI might have hallucinated a name in parameters; we reject it here
                    return {"answer": f"I couldn't find a camera named '{target}' in the database. Please verify the name or ask me for a status report.", "intent": "ERROR"}
                
                if intent == "DELETE_CAMERA":
                    return {
                        "answer": f"Security Check: Are you sure you want to delete Camera: {camera_obj.camera_name}? This action cannot be undone.",
                        "intent": "CONFIRM_REQUIRED",
                        "target": str(camera_obj.id)
                    }
                
                new_status = "inactive" if "OFF" in intent else "active"
                await camera_service.update_camera(str(camera_obj.id), CameraUpdate(status=new_status), user)
                return {"answer": f"{camera_obj.camera_name} has been switched to {new_status}.", "intent": intent, "status": "success"}

            # 3. STATS (USE FETCHED DATA ONLY)
            elif intent in ["GET_CAMERA_STATUS", "GET_CAMERA_COUNT"]:
                print(f"DEBUG: Computing Camera Stats for Query: {query}")
                print(f"DEBUG: Total Cams: {cam_total}, Online: {cam_online}, Offline: {cam_offline}")
                
                if cam_total == 0:
                    return {"answer": "No cameras found in the system.", "intent": intent}
                
                return {
                    "answer": f"There are {cam_total} cameras in total, with {cam_online} online and {cam_offline} offline.",
                    "intent": intent
                }

            elif intent == "GET_ALERT_COUNT":
                sev = params.get("severity")
                
                # Step 1: Default to No Filter
                time_range = None
                
                # Step 2: Extract from query explicitly
                query_lower = query.lower()
                
                if "total" in query_lower:
                    # Forced override
                    time_range = None
                elif "today" in query_lower or params.get("time") == "today":
                    time_range = "today"
                
                # Step 3: Fetch dynamically
                count = await alert_service.get_filtered_count(user, severity=sev, time_range=time_range)
                
                # DEBUG LOGGING (AS REQUESTED)
                print(f"DEBUG - QUERY: {query}")
                print(f"DEBUG - TIME FILTER: {time_range}")
                print(f"DEBUG - SEVERITY FILTER: {sev}")
                print(f"DEBUG - TOTAL COUNT FETCHED: {count}")
                
                # Build concise response
                msg = f"There are {count} alerts recorded"
                if sev: msg = f"There are {count} {sev} alerts recorded"
                if time_range == "today": msg += " today"
                msg += "."
                
                return {"answer": msg, "intent": intent}

            elif intent == "GET_USER_INFO":
                name_val = getattr(user, "name", getattr(user, "full_name", None))
                if not name_val:
                    return {"answer": "I couldn't find your name in the system profile.", "intent": intent}
                return {"answer": f"Your name is {name_val}, and your registered email is {user.email}.", "intent": intent}

            elif intent == "GET_RULES":
                if not active_rules:
                    return {"answer": "There are no detection rules configured in the system yet.", "intent": intent}
                rules_list = ", ".join([r.get('rule_name', 'Unnamed') for r in active_rules])
                return {"answer": f"The following detection rules are active: {rules_list}.", "intent": intent}

            # 4. RULES
            elif intent == "CREATE_RULE":
                obj = params.get("object", "person").lower()
                print(f"DEBUG: Creating Rule for object: {obj}")
                await db.db.rules.insert_one({
                    "rule_name": f"AI: Detect {obj.capitalize()}",
                    "owner_id": str(user.id),
                    "organization_id": current_org_id if (current_org_id := getattr(user, 'organization_id', None)) else None,
                    "target_object": obj,
                    "is_active": True,
                    "created_at": datetime.now(timezone.utc)
                })
                return {"answer": f"A new detection rule for '{obj}' has been created and activated.", "intent": intent, "status": "success"}
 
            # 5. CONFIRM ACTION (CRITICAL FIX)
            elif intent == "CONFIRM_ACTION":
                # To handle a confirmation, we must know what was being confirmed
                # We look at the last assistant message in history
                last_assistant_msg = next((m for m in reversed(history) if m.get("role") == "assistant"), None)
                
                if not last_assistant_msg:
                    return {"answer": "I'm not sure what you are confirming. How can I help you?", "intent": "HELP"}
                
                last_intent = last_assistant_msg.get("intent")
                # Look for hints in the content if intent is missing from history item
                last_content = last_assistant_msg.get("content", "").lower()
                
                if "delete camera" in last_content or last_intent == "CONFIRM_REQUIRED":
                    # Extract camera name from the confirmation message
                    # msg format: "Security Check: Are you sure you want to delete Camera: [NAME]?"
                    match = re.search(r"camera:\s*(.*?)\?", last_content, re.IGNORECASE)
                    cam_name = match.group(1).strip() if match else None
                    
                    if cam_name:
                        camera_obj = next((c for c in cameras if c.camera_name.lower() == cam_name.lower()), None)
                        if camera_obj:
                            await camera_service.delete_camera(str(camera_obj.id), user)
                            return {"answer": f"Confirmed. Camera '{camera_obj.camera_name}' has been successfully removed from the system.", "intent": "DELETE_CAMERA", "status": "success"}
                    
                    # Fallback to parameters if Regex fails
                    target_id = params.get("id") or params.get("target")
                    if target_id:
                        # try to find by name again just in case AI returned name as target
                        camera_obj = next((c for c in cameras if c.camera_name.lower() == str(target_id).lower()), None)
                        if camera_obj:
                            await camera_service.delete_camera(str(camera_obj.id), user)
                            return {"answer": f"Confirmed. Camera '{camera_obj.camera_name}' has been successfully removed from the system.", "intent": "DELETE_CAMERA", "status": "success"}
                        else:
                            try:
                                await camera_service.delete_camera(str(target_id), user)
                                return {"answer": "Confirmed. The requested camera has been removed.", "intent": "DELETE_CAMERA", "status": "success"}
                            except Exception as ex:
                                return {"answer": f"I couldn't complete the deletion. Are you sure the camera exists?", "intent": "ERROR"}
                    
                return {"answer": "I'm sorry, I couldn't execute that confirmation. Re-identifying request...", "intent": "HELP"}

            # 6. HELP/FORMATTER
            else:
                # We reuse the real data context to force the formatted answer to be accurate
                format_prompt = (
                    f"You are the NexVigil AI Controller. Use ONLY the following data to answer the user's question. "
                    f"If the user is asking to delete or modify something and hasn't confirmed yet, remind them. "
                    f"If the answer is not in the data, say 'I couldn't find that information in the system.'\n\n"
                    f"{real_data_context}\n\n"
                    f"User Query: {query}\n\n"
                    "Response (Concise & Professional):"
                )
                answer = await ask_ai_async(format_prompt)
                return {"answer": answer, "intent": "HELP"}

        except Exception as e:
            # VERBOSE LOGGING FOR DEBUGGING
            import traceback
            error_details = traceback.format_exc()
            print(f"DEBUG: AI SERVICE CRITICAL FAILURE: {str(e)}")
            print(error_details)
            logger.error(f"AI Assistant Critical Error: {str(e)}\n{error_details}")
            # temporarily return the exact error trace to fix the issue
            return {"answer": f"Backend Error Details:\n{str(e)}\n{traceback.format_exc().splitlines()[-2]}", "status": "error"}

ai_assistant_service = AIAssistantService()
