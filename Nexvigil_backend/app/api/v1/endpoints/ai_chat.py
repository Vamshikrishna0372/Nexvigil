from fastapi import APIRouter, Depends, HTTPException, Request
from typing import List, Dict, Optional
from app.api import deps
from app.schemas.user import UserResponse
from app.schemas.response import BaseResponse
from app.services.ai_assistant_service import ai_assistant_service
from app.db.mongodb import db

router = APIRouter()

@router.post("/chat", response_model=BaseResponse[dict])
async def ai_chat_assistant(
    request: Request,
    payload: dict,
    current_user: UserResponse = Depends(deps.get_current_active_user)
):
    """
    Process natural language queries to NexVigil AI Assistant.
    Can trigger filters, answer alerts, or propose rules.
    """
    query = payload.get("query")
    if not query:
        raise HTTPException(status_code=400, detail="Query is required")

    # Fetch last 50 alerts for context
    # Multi-tenancy check
    query_filter = {}
    if current_user.role != "admin":
        if current_user.organization_id:
            query_filter["organization_id"] = current_user.organization_id
        else:
            query_filter["owner_id"] = current_user.id

    cursor = db.db.alerts.find(query_filter).sort("created_at", -1).limit(50)
    recent_alerts = await cursor.to_list(length=50)

    # Process via AI Assistant (Now using Groq Controller)
    result = await ai_assistant_service.ask_ai(query, current_user, recent_alerts)
    if not result:
        return BaseResponse(
            success=False,
            message="AI Engine failure.",
            data={"answer": "Check API status.", "intent": "QUESTION"}
        )

    # Check for "RULE" intent and store if valid
    if result.get("intent") == "RULE":
        rule_data = result.get("data")
        if rule_data:
            # Simple direct insertion for AI-generated rules
            try:
                await db.db.rules.insert_one({
                    **rule_data,
                    "owner_id": current_user.id,
                    "organization_id": current_user.organization_id if hasattr(current_user, 'organization_id') else None,
                    "is_active": True,
                    "created_at": datetime.now()
                })
                result["rule_status"] = "applied"
            except Exception as e:
                logger.error(f"Rule Storage Error: {e}")
                result["rule_status"] = "failed_to_save"

    return BaseResponse(
        success=True,
        message="AI processing complete",
        data=result
    )

from datetime import datetime
