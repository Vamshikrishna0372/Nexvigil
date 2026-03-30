from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from app.api import deps
from app.schemas.response import BaseResponse
from app.schemas.ai import AIConfigCreate, AIConfigResponse, AIPerformanceMetric
from app.services.ai_service import ai_service
from app.schemas.user import UserResponse

router = APIRouter()

@router.get("/config", response_model=BaseResponse[AIConfigResponse])
async def get_ai_config(
    current_user: UserResponse = Depends(deps.get_current_admin_user)
):
    """
    Get current AI configuration (Admin).
    """
    config = await ai_service.get_config()
    return BaseResponse(
        success=True,
        message="AI Config retrieved",
        data=config
    )

@router.put("/config", response_model=BaseResponse[AIConfigResponse])
async def update_ai_config(
    config_in: AIConfigCreate,
    current_user: UserResponse = Depends(deps.get_current_admin_user)
):
    """
    Update AI configuration (Admin).
    """
    config = await ai_service.update_config(config_in)
    return BaseResponse(
        success=True,
        message="AI Config updated",
        data=config
    )

@router.get("/metrics", response_model=BaseResponse[List[AIPerformanceMetric]])
async def get_ai_metrics(
    camera_id: Optional[str] = None,
    current_user: UserResponse = Depends(deps.get_current_admin_user)
):
    """
    Get recent AI performance metrics (Admin).
    """
    metrics = await ai_service.get_latest_metrics(camera_id)
    return BaseResponse(
        success=True,
        message="AI Metrics retrieved",
        data=metrics
    )

from app.services.email_service import email_service

@router.get("/email-status", response_model=BaseResponse[dict])
async def get_email_status(
    current_user: UserResponse = Depends(deps.get_current_admin_user)
):
    """Check SMTP connection status"""
    status = await email_service.test_connection()
    return BaseResponse(
        success=status["status"] == "connected",
        message=status["message"],
        data=status
    )

@router.post("/email-test", response_model=BaseResponse[dict])
async def send_test_email(
    request: dict,
    current_user: UserResponse = Depends(deps.get_current_admin_user)
):
    """Send a test email to verify configuration"""
    recipient = request.get("recipient")
    if not recipient:
        raise HTTPException(status_code=400, detail="Recipient email is required")
        
    result = await email_service.send_test_email(recipient)
    return BaseResponse(
        success=result["success"],
        message=result["message"],
        data=result
    )

from app.services.ai_assistant_service import ai_assistant_service

@router.get("/test-gemini")
async def test_gemini_direct():
    """Manual Gemini connectivity test (Step 3)"""
    try:
        result = await ai_assistant_service.ask_ai("Say hello", [])
        return {"success": True, "result": result.get("answer")}
    except Exception as e:
        return {"success": False, "error": str(e)}

