from fastapi import APIRouter, Depends, Query, Path, Request
from typing import List, Optional
from datetime import datetime, timedelta
from app.api import deps
from app.schemas.user import UserResponse
from app.schemas.response import BaseResponse
from app.services.analytics_service import analytics_service
from app.schemas.analytics import AlertAnalyticsResponse, RiskScoreResponse, AIMetricsResponse, CameraHealthResponse, SystemOverviewResponse
from app.core.limiter import limiter
from app.core.config import settings

router = APIRouter()

@router.get("/alerts", response_model=BaseResponse[AlertAnalyticsResponse])
@limiter.limit(settings.RATE_LIMIT_ANALYTICS)
async def get_alert_analytics(
    request: Request,
    days: int = 30,
    camera_id: Optional[str] = None,
    severity: Optional[str] = None,
    current_user: UserResponse = Depends(deps.get_current_active_user)
):
    """
    Get aggregated alert statistics.
    """
    start_date = None
    if days > 0:
        start_date = datetime.utcnow() - timedelta(days=days)
    end_date = datetime.utcnow()
    
    is_admin = current_user.role == "admin"
    data = await analytics_service.get_alert_analytics(
        current_user.id, 
        is_admin, 
        start_date, 
        end_date,
        camera_id=camera_id,
        severity=severity
    )
    return BaseResponse(
        success=True,
        message="Analytics retrieved",
        data=data
    )

@router.get("/risk-score", response_model=BaseResponse[RiskScoreResponse])
@limiter.limit(settings.RATE_LIMIT_ANALYTICS)
async def get_risk_score(
    request: Request,
    current_user: UserResponse = Depends(deps.get_current_active_user)
):
    """
    Get user or system risk score.
    """
    is_admin = current_user.role == "admin"
    data = await analytics_service.calculate_risk_score(current_user.id, is_admin)
    return BaseResponse(
        success=True,
        message="Risk score calculated",
        data=data
    )

@router.get("/ai-metrics", response_model=BaseResponse[dict])
@limiter.limit(settings.RATE_LIMIT_ANALYTICS)
async def get_ai_metrics(
    request: Request,
    current_user: UserResponse = Depends(deps.get_current_active_user)
):
    """
    Get AI model performance stats.
    """
    data = await analytics_service.get_ai_performance()
    return BaseResponse(
        success=True,
        message="AI metrics retrieved",
        data=data
    )

@router.get("/camera-health", response_model=BaseResponse[CameraHealthResponse])
@limiter.limit(settings.RATE_LIMIT_ANALYTICS)
async def get_camera_health(
    request: Request,
    current_user: UserResponse = Depends(deps.get_current_active_user)
):
    """
    Get camera uptime analytics.
    """
    is_admin = current_user.role == "admin"
    data = await analytics_service.get_camera_health(current_user.id, is_admin)
    return BaseResponse(
        success=True,
        message="Camera health stats retrieved",
        data=data
    )

@router.get("/trends", response_model=BaseResponse[list])
@limiter.limit(settings.RATE_LIMIT_ANALYTICS)
async def get_trends(
    request: Request,
    metric: str = "alerts", # alerts, risk, ai_performance
    days: int = 7,
    current_user: UserResponse = Depends(deps.get_current_active_user)
):
    """
    Get time-series trends.
    """
    is_admin = current_user.role == "admin"
    data = await analytics_service.get_trends(metric, days, current_user.id, is_admin)
    return BaseResponse(
        success=True,
        message="Trends retrieved",
        data=data
    )

@router.get("/admin/system-overview", response_model=BaseResponse[SystemOverviewResponse])
@limiter.limit(settings.RATE_LIMIT_ANALYTICS)
async def get_system_overview_stats(
    request: Request,
    current_user: UserResponse = Depends(deps.get_current_admin_user)
):
    """
    Get global system overview for Admin.
    """
    data = await analytics_service.get_system_overview()
    return BaseResponse(
        success=True,
        message="System overview retrieved",
        data=SystemOverviewResponse(**data)
    )
