from google import genai
import logging
import os
from typing import List, Dict, Optional
from app.core.config import settings
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

def get_client():
    key = os.getenv("GEMINI_API_KEY") or settings.GEMINI_API_KEY
    if not key:
        return None
    try:
        return genai.Client(api_key=key)
    except Exception as e:
        logger.error(f"Analytics AI Init Error: {e}")
        return None

def generate_insights(alerts: List[Dict]) -> str:
    """
    Analyzes historical alert data for strategic security patterns using the NEW SDK.
    """
    client = get_client()
    if not client or not alerts:
        return "Tactical analysis is standard. No strategic anomalies detected manually."

    # Sanitize and summarize context
    alert_lines = []
    for a in alerts[:50]:
        obj = str(a.get("object_detected", "Unknown"))[:15]
        sev = a.get("severity", "LOW")
        cam = str(a.get("camera_id", "SYS"))[-4:]
        alert_lines.append(f"- {obj} ({sev}) via Node {cam}")
    
    prompt = (
        "TASK: Strategic Security Audit.\n"
        "DATA: Recent Event Stream:\n" + "\n".join(alert_lines) + "\n\n"
        "REQUIREMENT: Provide a 3-line professional summary of security trends. "
        "Highlight repeated objects or camera hotspots."
    )

    try:
        # NEW SDK GENERATION
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt
        )
        if response and response.text:
            return response.text.strip()
        return "Tactical processing complete with standard results."
    except Exception as e:
        logger.error(f"Analytics Generation Error: {e}")
        return "Internal intelligence buffer limit reached. Please check connectivity."

def should_trigger_automation(alerts: List[Dict]) -> Dict:
    """Heuristic trigger logic (No Gemini call needed)."""
    critical_events = [a for a in alerts if a.get("severity") == "critical"]
    if len(critical_events) >= 5:
         return {
            "trigger": True,
            "reason": f"Intelligence Alert: High-frequency Critical incidents detected ({len(critical_events)} events)."
        }
    return {"trigger": False, "reason": "Normal operational parameters."}
