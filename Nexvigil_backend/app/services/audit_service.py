from datetime import datetime, timezone
from typing import List, Optional
from app.db.mongodb import db
from bson import ObjectId

class AuditService:
    collection_name = "audit_logs"

    async def log_action(self, user_id: str, action: str, details: str, resource: Optional[str] = None):
        log_entry = {
            "user_id": user_id,
            "action": action,
            "details": details,
            "resource": resource,
            "timestamp": datetime.now(timezone.utc)
        }
        await db.client[db.db.name][self.collection_name].insert_one(log_entry)

    async def get_logs(self, limit: int = 100) -> List[dict]:
        cursor = db.client[db.db.name][self.collection_name].find().sort("timestamp", -1).limit(limit)
        logs = await cursor.to_list(None)
        for log in logs:
            log["_id"] = str(log["_id"])
        return logs

audit_service = AuditService()
