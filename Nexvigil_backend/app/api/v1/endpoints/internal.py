from fastapi import UploadFile, File, Form, APIRouter, Depends, status, Request
from typing import Optional
from app.api import deps
from app.services.camera_service import camera_service
from pydantic import BaseModel
from app.schemas.alert import AlertCreate
from app.services.alert_service import alert_service
from app.schemas.analytics import AIMetricsCreate
from app.services.analytics_service import analytics_service
from app.core.limiter import limiter
from app.core.config import settings
from app.services.storage_service import storage_service

router = APIRouter()

class HeartbeatRequest(BaseModel):
    camera_id: str
    health_status: str
    fps: Optional[float] = 0.0
    telemetry: Optional[dict] = {}

class StorageReportRequest(BaseModel):
    camera_id: str
    size_mb: float
    file_path: str

@router.post("/camera-heartbeat", status_code=status.HTTP_200_OK)
async def camera_heartbeat(
    request: Request,
    payload: HeartbeatRequest,
    authorized: bool = Depends(deps.validate_internal_api_key)
):
    """
    Internal endpoint for AI Agent to update camera health.
    """
    await camera_service.update_health(payload.camera_id, payload.health_status, payload.fps, payload.telemetry)
    return {"status": "ok", "message": "Health updated"}

class CameraEventLog(BaseModel):
    camera_id: str
    event_type: str
    details: str
    severity: str = "info"

@router.post("/camera-logs", status_code=status.HTTP_201_CREATED)
async def create_camera_log_internal(
    payload: CameraEventLog,
    authorized: bool = Depends(deps.validate_internal_api_key)
):
    """
    Internal endpoint for AI Agent to post camera-specific logs.
    """
    from app.services.camera_log_service import camera_log_service
    await camera_log_service.log_event(
        payload.camera_id, 
        payload.event_type, 
        payload.details, 
        payload.severity
    )
    return {"status": "created"}

@router.post("/storage/report", status_code=status.HTTP_200_OK)
async def report_storage_usage(
    request: Request,
    payload: StorageReportRequest,
    authorized: bool = Depends(deps.validate_internal_api_key)
):
    """
    Internal endpoint for AI Agent to report recording storage consumption.
    """
    camera = await camera_service.get_camera_by_id(payload.camera_id)
    if camera:
        owner_id = camera["owner_id"]
        await storage_service.update_storage_stats(owner_id, payload.size_mb, 1)
    return {"status": "ok"}

@router.post("/alerts", status_code=status.HTTP_201_CREATED)
@limiter.limit(settings.RATE_LIMIT_ALERTS)
async def create_alert_internal(
    request: Request,
    alert_in: AlertCreate,
    authorized: bool = Depends(deps.validate_internal_api_key)
):
    """
    Internal endpoint for AI Agent to post alerts.
    """
    alert = await alert_service.create_alert_from_ai(alert_in)
    return {"status": "created", "alert_id": alert.id}

@router.post("/ai-metrics", status_code=status.HTTP_201_CREATED)
async def report_ai_metrics(
    request: Request,
    metrics: AIMetricsCreate,
    authorized: bool = Depends(deps.validate_internal_api_key)
):
    """
    Internal endpoint for AI Agent to report performance metrics.
    """
    await analytics_service.record_ai_metrics(metrics.model_dump())
    return {"status": "recorded"}

from app.schemas.model import ActiveModelResponse
from app.services.model_service import model_service
from app.schemas.ai import AIConfigResponse
from app.services.ai_service import ai_service

@router.get("/active-model", response_model=ActiveModelResponse)
async def get_active_model_config(
    authorized: bool = Depends(deps.validate_internal_api_key)
):
    """
    Internal endpoint for AI Agent to check which model to load.
    """
    active = await model_service.get_active_model()
    if not active:
        # Default fallback
        return {
            "model_name": "yolov8n",
            "version": "default",
            "file_path": "yolov8n.pt"
        }
    return active

@router.get("/ai-config", response_model=AIConfigResponse)
async def get_internal_ai_config(
    authorized: bool = Depends(deps.validate_internal_api_key)
):
    """
    Internal endpoint for AI Agent to fetch dynamic configuration.
    """
    return await ai_service.get_config()

from fastapi import UploadFile, File, Form
from app.services.storage_service import storage_service
from app.services.alert_service import alert_service
from app.schemas.alert import AlertCreate

@router.post("/ingest", status_code=status.HTTP_201_CREATED)
async def ingest_alert_with_media(
    camera_id: str = Form(...),
    object_detected: str = Form("unknown"),
    confidence: float = Form(0.0),
    triggered_rule_id: Optional[str] = Form(None),
    screenshot: UploadFile = File(None),
    video: UploadFile = File(None),
    authorized: bool = Depends(deps.validate_internal_api_key)
):
    """
    Ingest alert with media files (Multipart).
    """
    # 1. Validate Camera -> Get Owner
    camera = await camera_service.get_camera_by_id(camera_id)
    if not camera:
         return {"status": "error", "message": "Camera not found"}
         
    owner_id = camera["owner_id"]
    org_id = camera.get("organization_id")
    
    # 2. Save Files
    screenshot_path = None
    video_path = None
    
    if screenshot:
         rel_path, size_mb = await storage_service.save_alert_media(owner_id, screenshot, "screenshot", camera_id)
         screenshot_path = rel_path
         
    if video:
         rel_path, size_mb = await storage_service.save_alert_media(owner_id, video, "video", camera_id)
         video_path = rel_path
         
    # 3. Create Alert
    alert_in = AlertCreate(
        camera_id=camera_id,
        object_detected=object_detected,
        confidence=confidence,
        triggered_rule_id=triggered_rule_id,
        screenshot_path=screenshot_path,
        video_path=video_path
    )
    
    alert = await alert_service.create_alert_from_ai(alert_in)
    if not alert:
         return {"status": "ignored"}
         
    return {"status": "created", "alert_id": alert.id}
@router.get("/cameras/active", status_code=status.HTTP_200_OK)
async def get_active_cameras(
    authorized: bool = Depends(deps.validate_internal_api_key)
):
    """
    Get list of active cameras for AI processing.
    """
    from app.db.mongodb import db
    import logging
    logger = logging.getLogger(__name__)
    
    if db.db is None:
        logger.error("INTERNAL API: db.db is None!")
        return []
    
    logger.info(f"INTERNAL API: Fetching cameras from {db.db.name}")
    cursor = db.client[db.db.name]["cameras"].find({"status": {"$in": ["active", "online", "offline", "unknown"]}})
    cameras = await cursor.to_list(length=100)
    logger.info(f"INTERNAL API: Found {len(cameras)} cameras")
    
    result = []
    for cam in cameras:
        result.append({
            "id": str(cam["_id"]),
            "camera_url": cam.get("camera_url", ""),
            "camera_name": cam.get("camera_name", "Unknown")
        })
    return result

@router.get("/rules/active", status_code=status.HTTP_200_OK)
async def get_active_rules(
    authorized: bool = Depends(deps.validate_internal_api_key)
):
    """
    Get list of ONLY active detection rules for AI processing.
    This endpoint is called exclusively by the AI agent every 15 seconds.
    Only rules with is_active=True are returned, ensuring disabled rules
    do not trigger any detections or alerts.
    """
    from app.services.rule_service import rule_service
    return await rule_service.get_active_rules()
