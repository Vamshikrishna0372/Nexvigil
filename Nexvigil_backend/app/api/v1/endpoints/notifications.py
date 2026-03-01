from fastapi import APIRouter, Depends, Query, Path
from typing import List, Optional
from app.api import deps
from app.schemas.user import UserResponse
from app.schemas.response import BaseResponse
from app.services.notification_service import notification_service

router = APIRouter()

@router.get("/", response_model=BaseResponse[list])
async def get_notifications(
    limit: int = 50,
    current_user: UserResponse = Depends(deps.get_current_active_user)
):
    """
    Get in-app notifications.
    """
    notifs = await notification_service.get_notifications(current_user.id, limit)
    return BaseResponse(
        success=True,
        message="Notifications retrieved",
        data=notifs
    )

@router.get("/unread-count", response_model=BaseResponse[int])
async def get_unread_count(
    current_user: UserResponse = Depends(deps.get_current_active_user)
):
    """
    Get unread notification count.
    """
    count = await notification_service.get_unread_count(current_user.id)
    return BaseResponse(
        success=True,
        message="Count retrieved",
        data=count
    )

@router.patch("/{notification_id}/read", response_model=BaseResponse[dict])
async def mark_notification_read(
    notification_id: str,
    current_user: UserResponse = Depends(deps.get_current_active_user)
):
    """
    Mark notification as read.
    """
    await notification_service.mark_read(notification_id, current_user.id)
    return BaseResponse(
        success=True,
        message="Notification marked as read"
    )

@router.put("/settings", response_model=BaseResponse[dict])
async def update_settings(
    settings: dict,
    current_user: UserResponse = Depends(deps.get_current_active_user)
):
    """
    Update notification preferences.
    """
    updated = await notification_service.update_settings(current_user.id, settings)
    return BaseResponse(
        success=True,
        message="Settings updated",
        data=updated
    )

@router.get("/settings", response_model=BaseResponse[dict])
async def get_settings(
    current_user: UserResponse = Depends(deps.get_current_active_user)
):
    """
    Get notification preferences.
    """
    settings_dict = await notification_service.get_user_settings(current_user.id)
    return BaseResponse(
        success=True,
        message="Settings retrieved",
        data=settings_dict
    )
