from fastapi import APIRouter, Depends, Query, Path
from typing import List, Optional
from app.api import deps
from app.schemas.user import UserResponse
from app.schemas.system import SystemSettingsResponse, SystemSettingsBase, DashboardSummary, SystemHealthResponse
from app.schemas.response import BaseResponse
from app.db.mongodb import db
from datetime import datetime, timezone, timedelta
import logging
import time
import threading

logger = logging.getLogger(__name__)

router = APIRouter()

# Track startup time for uptime
_START_TIME = time.time()

@router.get("/summary", response_model=BaseResponse[DashboardSummary])
async def get_dashboard_summary(
    current_user: UserResponse = Depends(deps.get_current_active_user)
):
    """
    GET /system/summary
    Real-time dashboard statistics — all computed from DB, no mock data.
    """
    base_camera_query = {}
    base_alert_query = {}

    # Role-based data isolation
    if current_user.role != "admin":
        if current_user.organization_id:
            base_camera_query["organization_id"] = current_user.organization_id
            base_alert_query["organization_id"] = current_user.organization_id
        else:
            base_camera_query["owner_id"] = current_user.id
            base_alert_query["owner_id"] = current_user.id

    # Camera counts
    total_cameras = await db.db["cameras"].count_documents(base_camera_query)
    active_cameras = await db.db["cameras"].count_documents({**base_camera_query, "status": "active"})
    offline_cameras = total_cameras - active_cameras

    # Alert counts - total
    total_alerts = await db.db["alerts"].count_documents(base_alert_query)

    # Alerts today (UTC day boundary)
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    alerts_today = await db.db["alerts"].count_documents({
        **base_alert_query,
        "created_at": {"$gte": today_start}
    })

    # Alerts by severity
    critical_alerts = await db.db["alerts"].count_documents({**base_alert_query, "severity": "critical"})
    high_alerts     = await db.db["alerts"].count_documents({**base_alert_query, "severity": "high"})
    medium_alerts   = await db.db["alerts"].count_documents({**base_alert_query, "severity": "medium"})
    low_alerts      = await db.db["alerts"].count_documents({**base_alert_query, "severity": "low"})

    # Unread Notifications
    unread_notifications = await db.db["notifications"].count_documents(
        {"user_id": current_user.id, "is_read": False}
    )

    # Storage Used
    storage_stats = await db.db["storage_stats"].find_one({"user_id": current_user.id})
    storage_used_mb = storage_stats.get("used_storage_mb", 0.0) if storage_stats else 0.0

    if current_user.role == "admin":
        pipeline = [{"$group": {"_id": None, "total": {"$sum": "$used_storage_mb"}}}]
        agg = await db.db["storage_stats"].aggregate(pipeline).to_list(1)
        if agg:
            storage_used_mb = agg[0]["total"]

    # AI Status
    sys_settings = await db.db["system_settings"].find_one({})
    ai_status = sys_settings.get("ai_engine_status", "running") if sys_settings else "running"

    # Most detected objects (top 5 from last 24h)
    cutoff_24h = datetime.now(timezone.utc) - timedelta(hours=24)
    most_detected_pipeline = [
        {"$match": {**base_alert_query, "created_at": {"$gte": cutoff_24h}}},
        {"$group": {"_id": "$object_detected", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5},
        {"$project": {"object": "$_id", "count": 1, "_id": 0}}
    ]
    most_detected_raw = await db.db["alerts"].aggregate(most_detected_pipeline).to_list(5)
    most_detected = [{"object": d.get("object", "Unknown"), "count": d.get("count", 0)} for d in most_detected_raw]

    summary = DashboardSummary(
        active_cameras=active_cameras,
        offline_cameras=offline_cameras,
        total_cameras=total_cameras,
        total_alerts=total_alerts,
        alerts_today=alerts_today,
        critical_alerts=critical_alerts,
        high_alerts=high_alerts,
        medium_alerts=medium_alerts,
        low_alerts=low_alerts,
        unread_notifications=unread_notifications,
        storage_used_mb=storage_used_mb,
        ai_status=ai_status,
        server_time=datetime.now(timezone.utc),
        most_detected=most_detected
    )

    return BaseResponse(
        success=True,
        message="Dashboard summary retrieved",
        data=summary
    )


@router.get("/health", response_model=BaseResponse[SystemHealthResponse])
async def get_system_health(
    current_user: UserResponse = Depends(deps.get_current_active_user)
):
    """
    GET /system/health
    Returns real-time system health metrics: AI engine status, cameras, threads, memory, CPU, uptime.
    """
    # Database status
    db_status = "unknown"
    try:
        if db.client:
            await db.client.admin.command("ping")
            db_status = "connected"
        else:
            db_status = "disconnected"
    except Exception:
        db_status = "error"

    # AI Engine Status
    sys_settings = await db.db["system_settings"].find_one({})
    ai_engine_status = sys_settings.get("ai_engine_status", "unknown") if sys_settings else "unknown"

    # Active cameras
    camera_query = {} if current_user.role == "admin" else {"owner_id": current_user.id}
    active_cameras = await db.db["cameras"].count_documents({**camera_query, "status": "active"})

    # Total alerts in DB
    alert_query = {} if current_user.role == "admin" else {"owner_id": current_user.id}
    total_alerts_in_db = await db.db["alerts"].count_documents(alert_query)

    # Thread count
    total_threads = threading.active_count()

    # Memory usage
    memory_usage_mb = 0.0
    memory_percent = 0.0
    cpu_percent = 0.0
    try:
        import psutil
        process = psutil.Process()
        mem = process.memory_info()
        memory_usage_mb = round(mem.rss / (1024 * 1024), 2)
        memory_percent = round(process.memory_percent(), 2)
        cpu_percent = round(process.cpu_percent(interval=0.1), 2)
    except ImportError:
        pass  # psutil not available

    # Uptime
    uptime_seconds = round(time.time() - _START_TIME, 2)

    health = SystemHealthResponse(
        ai_engine_status=ai_engine_status,
        active_cameras=active_cameras,
        total_threads=total_threads,
        memory_usage_mb=memory_usage_mb,
        memory_percent=memory_percent,
        cpu_percent=cpu_percent,
        uptime_seconds=uptime_seconds,
        database_status=db_status,
        total_alerts_in_db=total_alerts_in_db
    )

    return BaseResponse(
        success=True,
        message="System health retrieved",
        data=health
    )


@router.get("/system-settings", response_model=BaseResponse[SystemSettingsResponse])
async def get_system_settings(
    current_user: UserResponse = Depends(deps.get_current_admin_user)
):
    """
    Get global system settings (Admin Only).
    """
    settings = await db.db["system_settings"].find_one({})
    if not settings:
        settings = SystemSettingsBase().model_dump()
        settings["updated_at"] = datetime.now(timezone.utc)
        result = await db.db["system_settings"].insert_one(settings)
        settings["_id"] = result.inserted_id

    # Ensure all fields exist (in case of partial updates from other tools)
    defaults = SystemSettingsBase().model_dump()
    for k, v in defaults.items():
        if k not in settings:
            settings[k] = v

    settings["id"] = str(settings["_id"])
    return BaseResponse(
        success=True,
        message="System settings retrieved",
        data=settings
    )


@router.put("/system-settings", response_model=BaseResponse[SystemSettingsResponse])
async def update_system_settings(
    settings_in: SystemSettingsBase,
    current_user: UserResponse = Depends(deps.get_current_admin_user)
):
    """
    Update global system settings (Admin Only).
    """
    update_data = settings_in.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc)
    update_data["updated_by"] = current_user.id

    await db.db["system_settings"].update_one(
        {},
        {"$set": update_data},
        upsert=True
    )

    updated = await db.db["system_settings"].find_one({})
    updated["id"] = str(updated["_id"])

    return BaseResponse(
        success=True,
        message="System settings updated",
        data=updated
    )


@router.post("/ai-engine/toggle", response_model=BaseResponse[dict])
async def toggle_ai_engine(
    status: str,  # running or stopped
    current_user: UserResponse = Depends(deps.get_current_admin_user)
):
    """
    Toggle AI engine status.
    """
    from fastapi import HTTPException
    if status not in ["running", "stopped"]:
        raise HTTPException(status_code=400, detail="Status must be running or stopped")

    await db.db["system_settings"].update_one(
        {},
        {"$set": {"ai_engine_status": status, "updated_at": datetime.now(timezone.utc)}},
        upsert=True
    )

    return BaseResponse(
        success=True,
        message=f"AI Engine status set to {status}",
        data={"status": status}
    )


@router.get("/audit-logs", response_model=BaseResponse[List[dict]])
async def list_audit_logs(
    limit: int = 100,
    current_user: UserResponse = Depends(deps.get_current_admin_user)
):
    """
    Get system audit logs (Admin Only).
    """
    from app.services.audit_service import audit_service
    logs = await audit_service.get_logs(limit)
    return BaseResponse(
        success=True,
        message="Audit logs retrieved",
        data=logs
    )
