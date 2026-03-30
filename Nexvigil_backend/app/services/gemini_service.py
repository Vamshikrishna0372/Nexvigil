from app.core.gemini import gemini_client
import logging
import json
import re
from typing import Dict, Optional

logger = logging.getLogger(__name__)

# Cache for recurring detections to prevent API burnout
GEMINI_CACHE = {}

async def analyze_detection(label: str, location: str, datetime_str: str) -> dict:
    safe_label = label[:20].lower()
    cache_key = f"{safe_label}_{location[:20]}"
    if cache_key in GEMINI_CACHE:
        return GEMINI_CACHE[cache_key]

    default_res = {
        "severity": "CRITICAL" if safe_label in ["person", "car"] else "WARNING",
        "reason": f"{label.capitalize()} detected at {location}."
    }

    # Prompt for the centralized client
    prompt = (
        f"Analyze this security detection: '{safe_label}' at '{location}' on {datetime_str}. "
        "Provide a concise summary of why it matters and assign a severity (LOW, WARNING, CRITICAL). "
        "Return ONLY JSON: { 'severity': '...', 'reason': '...' }"
    )

    # Call Gemini for intelligent analysis
    try:
        # Use latest stable identifier to avoid 404s
        result_text = await gemini_client.generate_content(prompt, model="gemini-1.5-flash-latest")
        if not result_text:
            return default_res
    except Exception as e:
        # Silent fallback to prevent 500 errors in the pipeline
        logger.warning(f"Gemini Analysis Failed (Switching to Fallback): {e}")
        return default_res

    try:
        match = re.search(r'\{.*\}', result_text, re.DOTALL)
        if match:
            data = json.loads(match.group())
            final_res = {
                "severity": str(data.get("severity", default_res["severity"])).upper(),
                "reason": str(data.get("reason", default_res["reason"]))
            }
            GEMINI_CACHE[cache_key] = final_res
            return final_res
    except Exception as e:
        logger.error(f"Detection Analysis Parsing Error: {e}")
    
    return default_res

async def generate_alert_description(detection_label: str, location: str, time: str) -> str:
    analysis = await analyze_detection(detection_label, location, time)
    return analysis["reason"]
