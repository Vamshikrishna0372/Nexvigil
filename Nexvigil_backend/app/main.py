from fastapi import FastAPI, Request, status
# Triggering reload...
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import asyncio
import os
import platform
import subprocess
import socket
from datetime import datetime, timedelta
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.logging import setup_logging
from app.db.mongodb import db
from app.middlewares.logging import RequestLoggingMiddleware
from app.api.api import api_router
from app.core.limiter import limiter

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)

# Rate Limiter
# limiter imported from core

async def cleanup_recordings_task():
    """
    Background task to cleanup old recordings.
    """
    while True:
        try:
            logger.info("Running background cleanup...")
            # Fetch auto_delete_days setting
            sys_settings = await db.db.system_settings.find_one({})
            days = sys_settings.get("auto_delete_days", 30) if sys_settings else 30
            
            cutoff = datetime.utcnow() - timedelta(days=days)
            # Cleanup Logic
            result = await db.db.alerts.delete_many({"created_at": {"$lt": cutoff}})
            logger.info(f"Cleanup completed: Deleted {result.deleted_count} alerts older than {days} days.")
            
            # TODO: Also iterate and delete files, but requires query before delete_many.
            # Simplified: Let alerts be deleted, files might remain as orphans until separate disk cleanup script runs.
            # Or implement fetch -> iterate -> delete here.
            # For stability, just DB cleanup for now.
            
        except Exception as e:
            logger.error(f"Cleanup task failed: {e}")
        
        # Run daily (86400s)
        await asyncio.sleep(86400)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Life-span context manager for startup and shutdown events.
    """
    # Startup
    logger.info("Starting up application...")
    
    # [ROBUSTNESS] Ensure Node Auth Server is running
    auth_port = int(os.getenv("AUTH_PORT", 8081))
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(1)
            if s.connect_ex(('127.0.0.1', auth_port)) != 0:
                logger.info(f"Auth Server ({auth_port}) not detected. Attempting to launch...")
                # Path detection: Look in backend root
                # Since app/main.py is in app/ folder, we need to go up one level if we are there
                # But subprocess uses CWD, so let's be explicit
                backend_root = os.getcwd()
                server_path = os.path.join(backend_root, "auth_server.js")
                
                if not os.path.exists(server_path):
                    # Try parent if we are in app folder
                    parent = os.path.dirname(backend_root)
                    if os.path.exists(os.path.join(parent, "auth_server.js")):
                        backend_root = parent
                        server_path = os.path.join(backend_root, "auth_server.js")

                if os.path.exists(server_path):
                    logger.info(f"Found auth_server.js at {server_path}. Starting Node process...")
                    if platform.system() == "Windows":
                        # Use 'start' to run in a separate window or background
                        # CREATE_NO_WINDOW = 0x08000000
                        subprocess.Popen(f"node auth_server.js", shell=True, cwd=backend_root)
                    else:
                        subprocess.Popen(["node", "auth_server.js"], cwd=backend_root)
                    logger.info("✅ Node Auth Server launch command emitted.")
                else:
                    logger.warning(f"❌ auth_server.js NOT FOUND at {server_path}. Social login will fail.")
            else:
                logger.info(f"✅ Auth Server ({auth_port}) is already alive.")
    except Exception as e:
        logger.warning(f"⚠️ Could not verify/start Auth Server: {e}")
 
    try:
        # Create media directories in 'uploads' as requested by user
        from pathlib import Path
        media_root = Path(settings.MEDIA_DIR)
        media_root.mkdir(parents=True, exist_ok=True)
        (media_root / "screenshots").mkdir(parents=True, exist_ok=True)
        (media_root / "videos").mkdir(parents=True, exist_ok=True)
        (media_root / "live").mkdir(parents=True, exist_ok=True)
        (media_root / "alerts").mkdir(parents=True, exist_ok=True) # Backwards compat
        
        await db.connect_to_database()
        
        # Start background worker
        asyncio.create_task(cleanup_recordings_task())
        
    except Exception as e:
        logger.critical(f"Failed to connect to database on startup: {e}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down application...")
    await db.close_database_connection()

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url=None if settings.ENVIRONMENT == "production" else "/redoc"
)

# Middleware
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Add custom request logging middleware FIRST (so CORS wraps it)
app.add_middleware(RequestLoggingMiddleware)

# CORS Configuration
# Note: allow_credentials=True requires explicit origins OR allow_origin_regex
cors_origins = settings.all_cors_origins
if not cors_origins:
    cors_origins = ["https://nexvigil.vercel.app"]

logger.info(f"CORS allowed origins: {cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    # Support all Vercel and Ngrok deployment domains
    allow_origin_regex=r"https://.*\.vercel\.app|https://.*\.ngrok-free\.(dev|app)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "ngrok-skip-browser-warning", "Authorization"],
    expose_headers=["Content-Range", "Accept-Ranges", "Content-Length"],
)

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global error: {exc}", exc_info=True)
    
    content = {
        "success": False,
        "message": "Internal Server Error",
        "error_code": "INTERNAL_ERROR"
    }
    
    if settings.ENVIRONMENT == "development":
        content["details"] = str(exc)
    
    # Include CORS headers so browser doesn't block error responses
    origin = request.headers.get("origin", "")
    headers = {}
    if origin:
        if settings.ENVIRONMENT == "development" or origin in settings.all_cors_origins or origin.endswith(".vercel.app"):
            headers["Access-Control-Allow-Origin"] = origin
            headers["Access-Control-Allow-Credentials"] = "true"
            headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type, ngrok-skip-browser-warning"
        
    return JSONResponse(
        status_code=500,
        content=content,
        headers=headers
    )

# Include Routers
app.include_router(api_router, prefix="/api/v1")

# Mount Media Static Files with proper streaming support
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
import os
import mimetypes

# Ensure media types are mapped correctly for video playback
mimetypes.add_type("video/mp4", ".mp4")
mimetypes.add_type("video/webm", ".webm")
mimetypes.add_type("image/jpeg", ".jpg")
mimetypes.add_type("image/png", ".png")

media_path = os.path.abspath(settings.MEDIA_DIR)
if not os.path.exists(media_path):
    os.makedirs(media_path, exist_ok=True)

# Mount Media Static Files
# We mount BOTH /media and /uploads for total compatibility
app.mount("/media", StaticFiles(directory=media_path), name="media")
app.mount("/uploads", StaticFiles(directory=media_path), name="uploads")

@app.get("/", tags=["Root"])
async def root():
    return {
        "message": f"Welcome to {settings.APP_NAME} API", 
        "version": "1.0.0",
        "docs": "/docs" if settings.ENVIRONMENT != "production" else "Hidden"
    }

from app.services.ai_assistant_service import ai_assistant_service

@app.get("/debug-gemini", tags=["Debug"])
async def debug_gemini():
    """Manual Gemini connectivity test (Step 3)"""
    try:
        # Directly test the service's model
        model = ai_assistant_service._get_model()
        if not model:
            return {"success": False, "error": "Model initialization failed (Check API Key)"}
        
        response = model.generate_content("Say hello")
        return {"success": True, "text": response.text}
    except Exception as e:
        return {"success": False, "error": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
