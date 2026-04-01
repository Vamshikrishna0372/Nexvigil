from fastapi import APIRouter, Depends, HTTPException, status, Header, Query
from typing import Optional
from starlette.responses import StreamingResponse, FileResponse
from app.services.alert_service import alert_service
from app.services.storage_service import storage_service
from app.api import deps
from app.schemas.user import UserResponse
from bson import ObjectId
import os
import logging
from pathlib import Path
from app.core.config import settings
from app.db.mongodb import db

logger = logging.getLogger(__name__)
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
    # 1. Custom Auth Logic for Streaming (Supports Query Token for browser src)
    auth_token = None
    if authorization and authorization.startswith("Bearer "):
        auth_token = authorization.split(" ")[1]
    elif token:
        auth_token = token
        
    if not auth_token:
        raise HTTPException(status_code=401, detail="Authentication required")
        
    # 2. Validate manually (matching standard app deps)
    try:
        from app.services.user_service import user_service
        from app.schemas.user import UserResponse
        from jose import jwt
        
        payload = jwt.decode(auth_token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token: no subject")
            
        user_dict = await user_service.get_user_by_id(user_id)
        if not user_dict:
            raise HTTPException(status_code=401, detail="User not found")
            
        # Standardize user object with fallbacks
        user_dict["name"] = user_dict.get("name") or user_dict.get("displayName") or user_dict.get("email", "").split("@")[0] or "NexVigil User"
        user_dict["role"] = user_dict.get("role") or "user"
        user_dict["status"] = user_dict.get("status") or "active"
        user_dict["id"] = str(user_dict["_id"])
        
        current_user = UserResponse(**user_dict)
        
    except Exception as e:
        logger.error(f"Media Auth Error: {str(e)}")
        raise HTTPException(status_code=401, detail="Authentication failed")

    if media_type not in ["video", "screenshot"]:
        raise HTTPException(status_code=400, detail="Invalid media type")
        
    # 3. Check alert existence (Permissive check for localhost troubleshooting)
    alert = await db.db["alerts"].find_one({"_id": ObjectId(alert_id)})
    
    if not alert:
        logger.error(f"Media 404: Alert {alert_id} not in DB")
        raise HTTPException(status_code=404, detail="Media alert instance not found")
        
    # Permission Check: Admin or Owner
    owner_id_str = str(alert.get("owner_id"))
    is_owner = owner_id_str == current_user.id
    if not is_owner and current_user.role != "admin":
        logger.warning(f"Media 403: Security Violation - User {current_user.id} tried to access alert {alert_id} owned by {owner_id_str}")
        raise HTTPException(status_code=403, detail="Permission Denied for this media")
        
    relative_path = alert.get(f"{media_type}_path")
    if not relative_path:
        raise HTTPException(status_code=404, detail="No media path recorded for this incident")
        
    # 4. Resolve the path on disk (Robust Path Searching)
    clean_rel_path = relative_path.lstrip("/")
    if clean_rel_path.startswith("media/"):
        clean_rel_path = clean_rel_path.replace("media/", "", 1)
        
    # Strategy 1: Stored Path (Direct or Flat)
    full_path = (Path(settings.MEDIA_DIR) / clean_rel_path).resolve()
    
    # Strategy 2: User-Specific Folder Pattern
    if not full_path.exists():
        parts = clean_rel_path.split("/")
        if len(parts) >= 1:
            folder = parts[0]
            filename = parts[-1]
            try_path = (Path(settings.MEDIA_DIR) / folder / current_user.id / filename).resolve()
            if try_path.exists():
                full_path = try_path

    # Final existence check
    if not full_path.exists():
        logger.warning(f"File missing on disk: {full_path}")
        raise HTTPException(status_code=404, detail="Incident media file not found on server storage")
        
    # 5. Determine MIME and Serve
    media_mime = "image/jpeg" if media_type == "screenshot" else "video/mp4"
    if str(full_path).lower().endswith(".webm"):
        media_mime = "video/webm"

    return FileResponse(path=full_path, media_type=media_mime)


@router.get("/recordings", status_code=200)
async def list_recordings(
    current_user: UserResponse = Depends(deps.get_current_active_user)
):
    """
    List all alerts that have associated video recordings.
    """
    query = {"video_path": {"$ne": None}}
    if current_user.role != "admin":
        query["owner_id"] = current_user.id
        
    from app.utils import serialize_mongo
    cursor = db.db["alerts"].find(query).sort("created_at", -1)
    results = await cursor.to_list(length=100)
    return serialize_mongo(results)


@router.get("/status", status_code=200)
async def get_storage_status(
    current_user: UserResponse = Depends(deps.get_current_admin_user)
):
    """
    Admin-only: Get disk usage statistics.
    """
    return storage_service.get_disk_status()
