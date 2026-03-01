from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from app.api import deps
from app.schemas.response import BaseResponse
from app.schemas.anomaly import AnomalySummary
from app.services.anomaly_service import anomaly_service
from app.schemas.user import UserResponse

router = APIRouter()

from app.utils import serialize_mongo

@router.get("/summary")
async def get_anomaly_summary(
    current_user: UserResponse = Depends(deps.get_current_active_user)
):
    """
    Get Anomaly trends and events (Org Scoped).
    """
    # Scope by organization or user
    org_id = current_user.organization_id # Could be None for simple users
    summary = await anomaly_service.get_summary(org_id)
    return BaseResponse(
        success=True,
        message="Anomaly details retrieved",
        data=serialize_mongo(summary)
    )
