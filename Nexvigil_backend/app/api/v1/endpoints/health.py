from fastapi import APIRouter, status, Request
from app.core.config import settings
from app.db.mongodb import db
from datetime import datetime
import time
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# Start time for uptime calculation
START_TIME = time.time()

@router.get("/", status_code=status.HTTP_200_OK)
async def health_check():
    """
    Basic health check returning service status.
    """
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.utcnow().isoformat()
    }

@router.get("/db", status_code=status.HTTP_200_OK)
async def db_health_check():
    """
    Check MongoDB connectivity.
    """
    try:
        if db.client:
             # Ping the database
             await db.client.admin.command('ping')
             return {"status": "connected", "database": "mongodb"}
        else:
             return {"status": "disconnected", "database": "mongodb"}
    except Exception as e:
        logger.error(f"DB Health Check Failed: {e}")
        return {"status": "error", "details": str(e)}

@router.get("/system", status_code=status.HTTP_200_OK)
async def system_health_check(request: Request):
    """
    Comprehensive system health check.
    """
    api_status = "healthy"
    db_status = "unknown"
    ai_status = "unknown"
    storage_status = "normal"
    
    # DB Check
    try:
        if db.client:
            await db.client.admin.command('ping')
            db_status = "connected"
        else:
            db_status = "disconnected"
    except:
        db_status = "error"
        api_status = "degraded"

    # AI Status Check
    try:
        settings_doc = await db.db.system_settings.find_one({})
        ai_status = settings_doc.get("ai_engine_status", "stopped") if settings_doc else "stopped"
    except:
        ai_status = "error"

    # Uptime
    uptime_seconds = time.time() - START_TIME
    
    return {
        "api_status": api_status,
        "database_status": db_status,
        "ai_engine_status": ai_status,
        "storage_status": storage_status, # Placeholder logic
        "uptime_seconds": round(uptime_seconds, 2),
        "environment": settings.ENVIRONMENT
    }

@router.get("/version", status_code=status.HTTP_200_OK)
async def version_check():
     return {"version": "1.0.0"}
