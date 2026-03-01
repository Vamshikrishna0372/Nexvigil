from fastapi import APIRouter, Depends, HTTPException, status, Request
from typing import List, Optional
from datetime import datetime
from app.api import deps
from app.schemas.alert import AlertCreate, AlertResponse, AlertSummary
from app.services.alert_service import alert_service
from app.schemas.user import UserResponse
from app.schemas.response import BaseResponse

router = APIRouter()

from app.utils import serialize_mongo

@router.get("/")
async def read_alerts(
    skip: int = 0,
    limit: int = 20,
    severity: Optional[str] = None,
    camera_id: Optional[str] = None,
    acknowledged: Optional[bool] = None,
    current_user: UserResponse = Depends(deps.get_current_active_user),
    request: Request = None
):
    """
    Get list of alerts with filtering.
    """
    result = await alert_service.get_alerts(current_user, skip=skip, limit=limit, 
                                            severity=severity, camera_id=camera_id, 
                                            acknowledged=acknowledged, request=request)
    
    return BaseResponse(
        success=True,
        message="Alerts retrieved successfully",
        data=serialize_mongo(result)
    )

@router.get("/summary")
async def alerts_summary(
    current_user: UserResponse = Depends(deps.get_current_active_user)
):
    """
    Get alert summary stats.
    """
    summary = await alert_service.get_summary(current_user)
    return BaseResponse(
        success=True,
        message="Alert summary retrieved",
        data=summary
    )

@router.get("/{alert_id}")
async def read_alert(
    alert_id: str,
    current_user: UserResponse = Depends(deps.get_current_active_user),
    request: Request = None
):
    """
    Get specific alert details.
    """
    alert = await alert_service.get_alert_by_id(alert_id, current_user, request=request)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    return BaseResponse(
        success=True,
        message="Alert details retrieved",
        data=serialize_mongo(alert)
    )

@router.patch("/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: str,
    current_user: UserResponse = Depends(deps.get_current_active_user)
):
    """
    Acknowledge an alert.
    """
    alert = await alert_service.acknowledge_alert(alert_id, current_user)
    return BaseResponse(
        success=True,
        message="Alert acknowledged",
        data=serialize_mongo(alert)
    )

@router.delete("/{alert_id}", status_code=status.HTTP_200_OK)
async def delete_alert(
    alert_id: str,
    current_user: UserResponse = Depends(deps.get_current_admin_user)
):
    """
    Delete an alert (Admin only).
    """
    await alert_service.delete_alert(alert_id, current_user)
    return BaseResponse(
        success=True,
        message="Alert deleted successfully"
    )
