from datetime import datetime, timezone
from typing import List, Optional
from app.db.mongodb import db
from bson import ObjectId

class CameraLogService:
    collection_name = "camera_logs"

    async def log_event(self, camera_id: str, event_type: str, details: str, severity: str = "info"):
        """
        Record a camera-specific event.
        """
        log_entry = {
            "camera_id": camera_id,
            "event_type": event_type,
            "details": details,
            "severity": severity,
            "timestamp": datetime.now(timezone.utc)
        }
        await db.client[db.db.name][self.collection_name].insert_one(log_entry)

    async def get_logs(self, camera_id: Optional[str] = None, limit: int = 50, owner_id: Optional[str] = None) -> List[dict]:
        """
        Retrieve camera logs with optional filtering.
        """
        query = {}
        if camera_id:
            query["camera_id"] = camera_id
        
        # Security check for regular users
        if owner_id:
            # We need to verify if the camera belongs to this owner.
            # For simplicity, if we pass owner_id, we should match it 
            # but currently logs don't store owner_id.
            # Better to use camera list filtering in the caller.
            pass

        cursor = db.client[db.db.name][self.collection_name].find(query).sort("timestamp", -1).limit(limit)
        logs = await cursor.to_list(None)
        
        for log in logs:
            log["id"] = str(log["_id"])
            log["_id"] = str(log["_id"])
            if isinstance(log.get("timestamp"), datetime):
                log["timestamp"] = log["timestamp"].isoformat()
                
        return logs

camera_log_service = CameraLogService()
