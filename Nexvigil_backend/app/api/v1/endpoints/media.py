from fastapi import APIRouter, Depends, HTTPException, status, Header, Query
from typing import Optional
from starlette.responses import StreamingResponse
from app.services.alert_service import alert_service
from app.services.storage_service import storage_service
from app.api import deps
from app.schemas.user import UserResponse
from bson import ObjectId
import os
from pathlib import Path
from app.core.config import settings

# If StorageStatus isn't available, we might need to check storage_service or define it.
# Assuming storage_service.get_disk_status() returns a dict, we can use BaseResponse[dict] or generic dict.
# Let's import StorageStatus if it exists, or remove response_model if we are unsure.
# Ideally check storage schema.
# safe bet: response_model=dict or just return dict.

router = APIRouter()

@router.get("/{alert_id}/{media_type}", status_code=status.HTTP_200_OK)
async def get_media(
    alert_id: str,
    media_type: str, # video or screenshot
    token: Optional[str] = Query(None), # If streaming in browser src
    authorization: Optional[str] = Header(None) # Bearer check
):
    """
    Secure file streaming endpoint.
    Only Owner or Admin can access.
    """
    # Custom Auth Logic for Streaming
    auth_token = None
    if authorization and authorization.startswith("Bearer "):
         auth_token = authorization.split(" ")[1]
    elif token:
         auth_token = token
         
    if not auth_token:
         raise HTTPException(status_code=401, detail="Authentication required")
         
    # Validate manually
    try:
        from app.services.user_service import user_service
        from app.schemas.user import UserResponse
        from jose import jwt
        
        payload = jwt.decode(auth_token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
             raise HTTPException(status_code=401, detail="Invalid token")
             
        user_dict = await user_service.get_user_by_id(user_id)
        if not user_dict:
             raise HTTPException(status_code=401, detail="User not found")
             
        user_dict["id"] = str(user_dict["_id"])
        current_user = UserResponse(**user_dict)
        
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")
    if media_type not in ["video", "screenshot"]:
         raise HTTPException(status_code=400, detail="Invalid media type")
         
    # Check alert ownership via service
    alert = await alert_service.get_alert_by_id(alert_id, current_user)
    if not alert:
         raise HTTPException(status_code=404, detail="Media not found or access denied")
         
    relative_path = getattr(alert, f"{media_type}_path", None)
    if not relative_path:
         raise HTTPException(status_code=404, detail="File not found on server")
         
    # Sanitize and resolve the path
    # If the stored path starts with '/media/', strip it because settings.MEDIA_DIR already points to media/
    clean_rel_path = relative_path.lstrip("/")
    if clean_rel_path.startswith("media/"):
        clean_rel_path = clean_rel_path.replace("media/", "", 1)
        
    full_path = Path(settings.MEDIA_DIR) / clean_rel_path
    
    logger.info(f"Streaming media from: {full_path}")
    
    if not full_path.exists():
         raise HTTPException(status_code=404, detail=f"File missing on disk at {full_path}")
         
    # Stream response
    def iterfile():
        with open(full_path, mode="rb") as file_like:
            yield from file_like

    # Determine correct MIME type from extension
    media_mime = "image/jpeg"
    if media_type == "video":
        if str(full_path).lower().endswith(".webm"):
            media_mime = "video/webm"
        else:
            media_mime = "video/mp4"

    return StreamingResponse(iterfile(), media_type=media_mime)

@router.get("/recordings", status_code=200)
async def list_recordings(
    current_user: UserResponse = Depends(deps.get_current_active_user)
):
    """
    List all alerts that have associated video recordings.
    """
    from app.db.mongodb import db
    query = {"video_path": {"$ne": None}}
    if current_user.role != "admin":
        query["owner_id"] = current_user.id
        
    cursor = db.db["alerts"].find(query).sort("created_at", -1)
    results = await cursor.to_list(100)
    
    # Wrap in BaseResponse for consistency
    return {
        "success": True,
        "message": "Recordings retrieved",
        "data": [{
            "id": str(r["_id"]),
            "camera_id": r.get("camera_id"),
            "object": r.get("object_detected"),
            "timestamp": r.get("created_at"),
            "video_path": r.get("video_path"),
            "screenshot_path": r.get("screenshot_path"),
            "duration_seconds": r.get("duration_seconds"),
            "severity": r.get("severity")
        } for r in results]
    }

@router.get("/status", status_code=200)
async def check_storage_health(
    current_user: UserResponse = Depends(deps.get_current_admin_user)
):
    """
    Get disk usage statistics (Admin).
    """
    return storage_service.get_disk_status()
