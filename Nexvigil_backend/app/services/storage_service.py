import os
import shutil
import aiofiles
from datetime import datetime, timedelta, timezone
import time
from typing import Optional, Tuple
from fastapi import UploadFile, HTTPException, status
from app.db.mongodb import db
from app.core.config import settings
from app.schemas.storage import StorageStats, StorageStatus
import logging

logger = logging.getLogger(__name__)

class StorageService:
    recordings_dir = "videos"
    screenshots_dir = "screenshots"
    stats_collection = "storage_stats"
    
    def __init__(self):
        # Create root media dir and subdirs if not exists
        os.makedirs(settings.MEDIA_DIR, exist_ok=True)
        os.makedirs(os.path.join(settings.MEDIA_DIR, "screenshots"), exist_ok=True)
        os.makedirs(os.path.join(settings.MEDIA_DIR, "videos"), exist_ok=True)

    async def get_storage_stats(self, user_id: str) -> StorageStats:
        if not user_id:
             return StorageStats(user_id="unknown", last_updated=datetime.now(timezone.utc))
             
        stats = await db.client[db.db.name][self.stats_collection].find_one({"user_id": user_id})
        if not stats:
            stats = {
                "user_id": user_id,
                "used_storage_mb": 0.0,
                "total_files": 0,
                "last_updated": datetime.now(timezone.utc)
            }
            await db.client[db.db.name][self.stats_collection].insert_one(stats)
        
        return StorageStats(**stats)

    async def update_storage_stats(self, user_id: str, size_mb: float, count_diff: int):
        if not user_id:
             return
             
        await db.client[db.db.name][self.stats_collection].update_one(
            {"user_id": user_id},
            {
                "$inc": {"used_storage_mb": size_mb, "total_files": count_diff},
                "$set": {"last_updated": datetime.now(timezone.utc)}
            },
            upsert=True
        )

    async def save_alert_media(self, user_id: str, file: UploadFile, media_type: str, camera_id: str = None) -> Tuple[str, float]:
        """
        Saves uploaded file to disk. Returns (relative_path, size_mb).
        media_type: 'video' or 'image'
        """
        # 1. Check Quota
        stats = await self.get_storage_stats(user_id)
        # Check explicit quota from Org/Plan logic ideally, but simplest user limit from settings for now
        # OR fetch from org if available.
        # Fallback to config limit if plan logic complex. The prompt says "max_storage_per_user = 2048 MB".
        limit = settings.MAX_STORAGE_PER_USER_MB
        
        # Estimate size? UploadFile.size is not always available without reading.
        # If stream, we write and check.
        # For small files (screenshots), OK. For videos, could be large.
        
        if stats.used_storage_mb > limit:
             # Trigger cleanup or reject
             # Prompt says: "Reject recording OR Trigger cleanup policy."
             # Let's trigger cleanup attempt first.
             await self.cleanup_old_recordings(user_id)
             # Re-check
             stats = await self.get_storage_stats(user_id)
             if stats.used_storage_mb > limit:
                 raise HTTPException(status_code=507, detail="Storage quota exceeded")

        # 2. Determine Path
        current_time_int = int(time.time())
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        if media_type == "video":
            folder = self.recordings_dir
            ext = ".mp4"
            if not file.filename.endswith(ext):
                 ext = os.path.splitext(file.filename)[1]
        else:
            folder = self.screenshots_dir
            ext = ".jpg"
            if not file.filename.endswith(ext):
                 ext = os.path.splitext(file.filename)[1]

        user_folder = os.path.join(settings.MEDIA_DIR, folder, user_id)
        os.makedirs(user_folder, exist_ok=True)
        
        if media_type == "video" and camera_id:
            filename = f"{camera_id}_{current_time_int}{ext}"
        else:
            filename = f"alert_{timestamp}{ext}"
        path = os.path.join(user_folder, filename)
        
        # 3. Write File
        try:
            size_bytes = 0
            async with aiofiles.open(path, 'wb') as out_file:
                while content := await file.read(1024 * 1024):  # 1MB chunks
                    await out_file.write(content)
                    size_bytes += len(content)
                    
            size_mb = size_bytes / (1024 * 1024)
            
            # 4. Update Stats
            await self.update_storage_stats(user_id, size_mb, 1)
            
            # Return relative path for DB
            # We return just folder/user_id/filename. The service layer will correctly prefix /media/
            rel_path = f"{folder}/{user_id}/{filename}"
            return rel_path, size_mb
            
        except Exception as e:
            logger.error(f"File save failed: {e}")
            raise HTTPException(status_code=500, detail="File save failed")

    async def get_media_stream(self, relative_path: str):
        """
        Returns generator or path for streaming.
        Validates existence.
        """
        # Resolve full path
        # Prevent traversal
        if ".." in relative_path or relative_path.startswith("/"):
             raise HTTPException(status_code=400, detail="Invalid path")
             
        full_path = os.path.join(settings.MEDIA_DIR, relative_path)
        
        if not os.path.exists(full_path):
             raise HTTPException(status_code=404, detail="File not found")
             
        return full_path

    async def cleanup_old_recordings(self, user_id: str = None):
        """
        Deletes files older than retention policy.
        """
        sys = await db.client[db.db.name]["system_settings"].find_one({})
        days = sys.get("auto_delete_days", 30) if sys else 30
        
        cutoff = datetime.now() - timedelta(days=days)
        
        # Iterate files. This is expensive if many files.
        # Ideally, query DB for old alerts, get paths, delete files.
        # But 'files on disk' is the truth.
        # Let's interact via DB to keep sync.
        
        query = {"created_at": {"$lt": cutoff}}
        if user_id:
             query["owner_id"] = user_id
             
        # Find alerts to clean
        cursor = db.client[db.db.name]["alerts"].find(query)
        async for alert in cursor:
            # Delete files
            freed_mb = 0
            count_removed = 0
            
            if alert.get("video_path"):
                 full_path = os.path.join(settings.MEDIA_DIR, alert["video_path"])
                 if os.path.exists(full_path):
                      size = os.path.getsize(full_path) / (1024 * 1024)
                      os.remove(full_path)
                      freed_mb += size
                      count_removed += 1
                      
            if alert.get("screenshot_path"):
                 full_path = os.path.join(settings.MEDIA_DIR, alert["screenshot_path"])
                 if os.path.exists(full_path):
                      size = os.path.getsize(full_path) / (1024 * 1024)
                      os.remove(full_path)
                      freed_mb += size
                      count_removed += 1
            
            # Remove alert from DB or mark as archived? Usually delete.
            # But alerts are metadata. Maybe keep metadata, clear paths?
            # Prompt says "Delete files... Update StorageStats". It doesn't say delete alert.
            # But usually cleanup implies deleting data.
            # Let's clear paths in DB to avoid broken links.
            await db.client[db.db.name]["alerts"].update_one(
                {"_id": alert["_id"]},
                {"$set": {"video_path": None, "screenshot_path": None, "cleaned_up": True}}
            )
            
            if user_id:
                 await self.update_storage_stats(user_id, -freed_mb, -count_removed)
            else:
                 # If global cleanup, we need owner_id from alert to update specific user stats
                 u_id = alert.get("owner_id")
                 if u_id:
                      await self.update_storage_stats(u_id, -freed_mb, -count_removed)

    def get_disk_status(self) -> StorageStatus:
        total, used, free = shutil.disk_usage(settings.MEDIA_DIR)
        # Convert to MB
        total_mb = total / (1024 * 1024)
        used_mb = used / (1024 * 1024)
        free_mb = free / (1024 * 1024)
        percent = (used / total) * 100
        
        return StorageStatus(
            total_disk_space_mb=round(total_mb, 2),
            used_disk_space_mb=round(used_mb, 2),
            free_disk_space_mb=round(free_mb, 2),
            percentage_used=round(percent, 2)
        )

storage_service = StorageService()
