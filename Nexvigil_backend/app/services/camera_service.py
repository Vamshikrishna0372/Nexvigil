from app.db.mongodb import db
from app.schemas.camera import CameraCreate, CameraUpdate, CameraResponse
from app.schemas.user import UserResponse
from app.services.organization_service import organization_service
from fastapi import HTTPException, status
from typing import List, Optional
from datetime import datetime, timezone
from bson import ObjectId
from urllib.parse import urlparse
import logging
import cv2
import time

logger = logging.getLogger(__name__)

class CameraService:
    collection_name = "cameras"
    audit_collection = "audit_logs"

    @staticmethod
    def normalize_camera_url(source: str) -> str:
        """
        Part 1: Normalize phone IP camera URLs.
        - Auto-append /video to bare HTTP URLs (e.g. http://IP:8080 → http://IP:8080/video)
        - Handles URLs that have a path but don't end with /video
        """
        if not source or source.isdigit():
            return source

        if source.startswith("http://") or source.startswith("https://"):
            stripped = source.rstrip("/")
            try:
                parsed = urlparse(stripped)
                # No path or root-only path → append /video
                if not parsed.path or parsed.path == "/":
                    normalized = stripped + "/video"
                    logger.info(f"URL auto-corrected: {source} → {normalized}")
                    return normalized
                # Has path but doesn't end with /video
                if not parsed.path.endswith("/video"):
                    normalized = stripped + "/video"
                    logger.info(f"URL auto-corrected: {source} → {normalized}")
                    return normalized
            except Exception:
                pass

        return source

    def validate_camera_source(self, source: str):
        """
        Validate if a camera source is reachable and can provide frames.

        Device index cameras (0, 1, 2...) are accepted without live validation.
        URL-based streams are probed using FFMPEG backend with reduced buffering.
        We allow adding even if probe fails to handle transient network issues
        or phone sleep states.
        """
        logger.info(f"Validating camera source: {source}")
        try:
            # Device index — no live validation needed
            if source.isdigit():
                logger.info(f"Source {source} is device index.")
                return True, None

            # Part 2: Use FFMPEG backend for HTTP/RTSP streams
            video_source = source
            if video_source.startswith("rtsp://") or video_source.startswith("http://") or video_source.startswith("https://"):
                cap = cv2.VideoCapture(video_source, cv2.CAP_FFMPEG)
            else:
                cap = cv2.VideoCapture(video_source)

            if not cap.isOpened():
                logger.warning(f"Initial probe failed for {source}. Adding anyway (transient issue possible).")
                return True, None

            # Part 2: Reduce buffer to 1 for low latency
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

            # Wait 1 second for stream to stabilize
            time.sleep(1)
            ret, frame = cap.read()
            cap.release()

            if not ret or frame is None:
                logger.warning(f"Probe connected but failed to read frame from {source}. Adding anyway.")
                return True, None

            logger.info(f"Successfully validated camera source: {source}")
            return True, None
        except Exception as e:
            logger.error(f"Validation exception for {source}: {e}. Proceeding.")
            return True, None  # Validator errors should never block the user
    
    async def _log_audit(self, event: str, user_id: str, target_id: str, success: bool, details: dict = {}):
        """Helper to log security events."""
        log_entry = {
            "event": event,
            "user_id": user_id,
            "target_id": target_id,
            "success": success,
            "details": details,
            "timestamp": datetime.now(timezone.utc)
        }
        try:
             await db.client[db.db.name][self.audit_collection].insert_one(log_entry)
        except Exception as e:
            logger.error(f"Failed to write audit log: {e}")

    async def get_camera_by_id(self, camera_id: str) -> Optional[dict]:
        try:
            oid = ObjectId(camera_id)
        except:
            return None
        return await db.client[db.db.name][self.collection_name].find_one({"_id": oid})

    async def get_cameras(self, user: UserResponse, skip: int = 0, limit: int = 20, status_filter: Optional[str] = None) -> List[CameraResponse]:
        query = {}
        # Multi-tenancy check
        if user.role != "admin": # System Admin
             if user.organization_id:
                  query["organization_id"] = user.organization_id
             else:
                  # Fallback for old users or non-org users (should not happen in phase 9)
                  query["owner_id"] = user.id
            
        if status_filter:
            query["status"] = status_filter

        cursor = db.client[db.db.name][self.collection_name].find(query).skip(skip).limit(limit)
        cameras = await cursor.to_list(length=limit)
        
        for cam in cameras:
            cam["_id"] = str(cam["_id"])
            cam["id"] = cam["_id"]
            
        return [CameraResponse(**cam) for cam in cameras]
        
    async def create_camera(self, camera_in: CameraCreate, user: UserResponse) -> CameraResponse:
        # Check Organization Quota First
        if user.organization_id:
             await organization_service.check_quota(user.organization_id, "cameras")

        # Check duplicate name for organization (not just user)
        duplicate_query = {
            "camera_name": camera_in.camera_name
        }
        if user.organization_id:
             duplicate_query["organization_id"] = user.organization_id
        else:
             duplicate_query["owner_id"] = user.id

        # Check duplicate name
        existing_cam = await db.client[db.db.name][self.collection_name].find_one(duplicate_query)
        if existing_cam:
            await self._log_audit("camera_creation", user.id, None, False, {"reason": "duplicate_name"})
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Camera with this name already exists"
            )

        # Check duplicate source
        source_query = {"camera_url": camera_in.camera_url}
        if user.organization_id:
             source_query["organization_id"] = user.organization_id
        else:
             source_query["owner_id"] = user.id
             
        existing_source = await db.client[db.db.name][self.collection_name].find_one(source_query)
        if existing_source:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This camera source is already added"
            )

        # Part 1: Normalize URL (auto-append /video for phone IP cameras)
        normalized_url = self.normalize_camera_url(camera_in.camera_url)
        if normalized_url != camera_in.camera_url:
            camera_in.camera_url = normalized_url

        # Validate Camera Connection
        is_valid, error_msg = self.validate_camera_source(camera_in.camera_url)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )

        camera_dict = camera_in.model_dump()
        camera_dict["owner_id"] = user.id
        camera_dict["organization_id"] = user.organization_id
        camera_dict["status"] = "active"
        camera_dict["health_status"] = "unknown"
        camera_dict["last_active"] = None
        camera_dict["created_at"] = datetime.now(timezone.utc)
        camera_dict["updated_at"] = datetime.now(timezone.utc)
        
        result = await db.client[db.db.name][self.collection_name].insert_one(camera_dict)
        
        await self._log_audit("camera_created", user.id, str(result.inserted_id), True)
        
        camera_dict["id"] = str(result.inserted_id)
        camera_dict["_id"] = str(result.inserted_id)
        
        return CameraResponse(**camera_dict)
    
    async def update_camera(self, camera_id: str, camera_in: CameraUpdate, user: UserResponse) -> CameraResponse:
        camera = await self.get_camera_by_id(camera_id)
        if not camera:
            raise HTTPException(status_code=404, detail="Camera not found")

        # Isolation Logic
        is_authorized = False
        if user.role == "admin":
             is_authorized = True
        elif user.organization_id and camera.get("organization_id") == user.organization_id:
             # Check org role
             if user.org_role in ["org_admin"]:
                  is_authorized = True
             elif camera.get("owner_id") == user.id: # Creator can update
                  is_authorized = True
        elif camera.get("owner_id") == user.id:
             is_authorized = True
             
        if not is_authorized:
             raise HTTPException(status_code=403, detail="Forbidden")

        update_data = camera_in.model_dump(exclude_unset=True)
        update_data["updated_at"] = datetime.now(timezone.utc)
        
        await db.client[db.db.name][self.collection_name].update_one(
            {"_id": ObjectId(camera_id)},
            {"$set": update_data}
        )
        
        updated_camera = await self.get_camera_by_id(camera_id)
        updated_camera["_id"] = str(updated_camera["_id"])
        updated_camera["id"] = updated_camera["_id"]
        
        return CameraResponse(**updated_camera)

    async def delete_camera(self, camera_id: str, user: UserResponse):
        camera = await self.get_camera_by_id(camera_id)
        if not camera:
             raise HTTPException(status_code=404, detail="Camera not found")
             
        # Isolation Logic
        is_authorized = False
        if user.role == "admin":
             is_authorized = True
        elif user.organization_id and camera.get("organization_id") == user.organization_id:
             if user.org_role in ["org_admin"]:
                  is_authorized = True
        elif camera.get("owner_id") == user.id:
             is_authorized = True
             
        if not is_authorized:
             raise HTTPException(status_code=403, detail="Forbidden")
             
        await db.client[db.db.name][self.collection_name].delete_one({"_id": ObjectId(camera_id)})
        return {"message": "Camera deleted successfully"}

    async def update_health(self, camera_id: str, health_status: str, fps: float = 0.0, telemetry: Optional[dict] = None):
         # Internal
        valid_statuses = ["online", "offline", "unknown"]
        if health_status not in valid_statuses:
             raise HTTPException(status_code=400, detail="Invalid health status")
             
        try:
            oid = ObjectId(camera_id)
        except:
             return {"status": "error", "message": "Invalid ID format"}

        update_doc = {
            "health_status": health_status,
            "fps": fps,
            "updated_at": datetime.now(timezone.utc)
        }
        if health_status == "online":
            update_doc["last_active"] = datetime.now(timezone.utc)
        
        if telemetry:
            update_doc["telemetry"] = telemetry
             
        await db.client[db.db.name][self.collection_name].update_one(
            {"_id": oid},
            {"$set": update_doc}
        )
        return {"status": "updated"}

camera_service = CameraService()
