from app.db.mongodb import db
from app.core.config import settings
from app.schemas.alert import AlertCreate, AlertResponse, AlertSummary
from app.schemas.user import UserResponse
from fastapi import HTTPException, status, Request
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)

from app.services.notification_service import notification_service
from app.services.gemini_service import analyze_detection



class AlertService:
    collection_name = "alerts"
    camera_collection = "cameras"
    audit_collection = "audit_logs"

    async def _log_audit(self, event: str, user_id: str, target_id: str, success: bool, details: dict = {}):
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

    async def create_alert_from_ai(self, alert_in: AlertCreate) -> AlertResponse:
        # Validate camera exists
        try:
            camera_oid = ObjectId(alert_in.camera_id)
        except:
             raise HTTPException(status_code=400, detail="Invalid camera ID format")
             
        camera = await db.client[db.db.name][self.camera_collection].find_one({"_id": camera_oid})
        if not camera:
            raise HTTPException(status_code=404, detail="Camera not found")

        # Confidence gate — skip alerts with very low confidence
        # Lowered to 0.3 to allow rule-specific thresholds (e.g. Armed Threat) to pass through
        DEFAULT_THRESHOLD = 0.3
        if alert_in.confidence < DEFAULT_THRESHOLD:
             return None        # Phase 2: Intelligent AI Detection Analysis
        camera_name = camera.get("camera_name", "Unknown Camera")
        timestamp_str = datetime.now(timezone.utc).strftime("%Y-%M-%d %H:%M:%S UTC")
        
        alert_dict = alert_in.model_dump()
        alert_dict["owner_id"] = str(camera["owner_id"])
        alert_dict["organization_id"] = str(camera.get("organization_id")) if camera.get("organization_id") else None

        # --- Phase 2: Intelligent AI Detection Analysis ---
        analysis = await analyze_detection(alert_in.object_detected, camera_name, timestamp_str)
        severity = analysis.get("severity", "MEDIUM").lower()
        description = analysis.get("reason", f"Activity detected: {alert_in.object_detected} present at {camera_name}.")
        
        alert_dict["severity"] = severity
        alert_dict["description"] = description

        alert_dict["is_acknowledged"] = False
        alert_dict["acknowledged_by"] = None
        alert_dict["acknowledged_at"] = None
        alert_dict["created_at"] = datetime.now(timezone.utc)
        alert_dict["updated_at"] = datetime.now(timezone.utc)
        
        result = await db.db[self.collection_name].insert_one(alert_dict)
        
        alert_dict["id"] = str(result.inserted_id)
        alert_dict["_id"] = str(result.inserted_id)
        
        # Safe copy for background tasks
        alert_bg = alert_dict.copy()
        if isinstance(alert_bg.get("created_at"), datetime):
             alert_bg["created_at"] = alert_bg["created_at"].isoformat()
        if isinstance(alert_bg.get("updated_at"), datetime):
             alert_bg["updated_at"] = alert_bg["updated_at"].isoformat()
             
        import asyncio
        asyncio.create_task(notification_service.send_alert_notification(alert_bg))
        
        # Trigger Professional Email Alert (Critical events only)
        from app.services.email_service import email_service
        asyncio.create_task(email_service.send_alert_email(alert_bg))
        
        # Log 
        await self._log_audit("alert_created_ai", "system_ai", str(result.inserted_id), True, {"severity": severity})
        
        # Trigger Anomaly Analysis
        from app.services.anomaly_service import anomaly_service
        try:
             asyncio.create_task(anomaly_service.check_spike_anomaly(alert_in.camera_id, alert_dict.get("organization_id")))
             asyncio.create_task(anomaly_service.check_time_based_anomaly(alert_in.camera_id, alert_dict.get("organization_id")))
        except Exception as e:
             logger.error(f"Anomaly check failed: {e}")
        
        return AlertResponse(**alert_dict)

    async def get_alerts(self, user: UserResponse, skip: int = 0, limit: int = 20, 
                         severity: Optional[str] = None, camera_id: Optional[str] = None, 
                         acknowledged: Optional[bool] = None, request: Request = None) -> dict:
        query = {}
        # Multi-tenancy check
        if user.role != "admin": 
             if user.organization_id:
                  query["organization_id"] = user.organization_id
             else:
                  query["owner_id"] = user.id
            
        if severity:
            query["severity"] = severity
        if camera_id:
            query["camera_id"] = camera_id
        if acknowledged is not None:
             query["is_acknowledged"] = acknowledged

        total = await db.client[db.db.name][self.collection_name].count_documents(query)
        
        cursor = db.client[db.db.name][self.collection_name].find(query).sort("created_at", -1).skip(skip).limit(limit)
        alerts = await cursor.to_list(length=limit)
        
        # Determine Base URL for media
        base_url = str(request.base_url).rstrip("/") if request and settings.ENVIRONMENT == "development" else settings.BASE_URL
        
        for a in alerts:
            # Convert ObjectId to string to prevent Pydantic validation error
            a["_id"] = str(a["_id"])
            a["id"] = a["_id"]
            
            for p_key in ["video_path", "screenshot_path"]:
                rel_path = a.get(p_key)
                if rel_path:
                    # Clean the path to ensure it starts with /media/
                    # If it's already a full URL, skip.
                    if rel_path.startswith("http"):
                        continue
                        
                    clean_path = rel_path if rel_path.startswith("/") else f"/{rel_path}"
                    if not clean_path.startswith("/media/"):
                        clean_path = f"/media{clean_path}"
                        
                    a[p_key] = f"{base_url}{clean_path}?ngrok-skip-browser-warning=true"
                else: a[p_key] = None
           
        return {
            "total": total,
            "page": (skip // limit) + 1,
            "data": [AlertResponse(**a) for a in alerts]
        }

    async def get_alert_by_id(self, alert_id: str, user: UserResponse, request: Request = None) -> Optional[AlertResponse]:
        try:
            oid = ObjectId(alert_id)
        except:
            return None
            
        alert = await db.client[db.db.name][self.collection_name].find_one({"_id": oid})
        if not alert:
            return None
            
        # Isolation Logic
        is_authorized = False
        if user.role == "admin":
             is_authorized = True
        elif user.organization_id and alert.get("organization_id") == user.organization_id:
             is_authorized = True
        elif alert.get("owner_id") == user.id:
             is_authorized = True
             
        if not is_authorized:
             raise HTTPException(status_code=403, detail="Forbidden")
             
        # Determine Base URL
        base_url = str(request.base_url).rstrip("/") if request and settings.ENVIRONMENT == "development" else settings.BASE_URL

        alert["_id"] = str(alert["_id"])
        alert["id"] = alert["_id"]
        
        for p_key in ["video_path", "screenshot_path"]:
            rel_path = alert.get(p_key)
            if rel_path:
                if rel_path.startswith("http"):
                    continue
                clean_path = rel_path if rel_path.startswith("/") else f"/{rel_path}"
                if not clean_path.startswith("/media/"):
                    clean_path = f"/media{clean_path}"
                alert[p_key] = f"{base_url}{clean_path}?ngrok-skip-browser-warning=true"
            else:
                alert[p_key] = None
        
        return AlertResponse(**alert)

    async def acknowledge_alert(self, alert_id: str, user: UserResponse) -> AlertResponse:
        alert = await self.get_alert_by_id(alert_id, user) # Checks access
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        # Additional Role Check for Acknowledge
        if user.role != "admin":
             if user.organization_id:
                  if user.org_role == "viewer":
                       raise HTTPException(status_code=403, detail="Viewers cannot acknowledge alerts")
             
        update_data = {
            "is_acknowledged": True,
            "acknowledged_by": user.id,
            "acknowledged_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        await db.client[db.db.name][self.collection_name].update_one(
            {"_id": ObjectId(alert_id)},
            {"$set": update_data}
        )
        
        updated_alert = await db.client[db.db.name][self.collection_name].find_one({"_id": ObjectId(alert_id)})
        updated_alert["_id"] = str(updated_alert["_id"])
        updated_alert["id"] = updated_alert["_id"]
        
        await self._log_audit("alert_acknowledged", user.id, alert_id, True)
        
        return AlertResponse(**updated_alert)

    async def delete_alert(self, alert_id: str, user: UserResponse):
        # Admin only (System Admin or Org Admin?) Prompt said "Admin only". Assuming System or Org Admin.
        # "Admin-only alert deletion" in prev phase usually meant System Admin.
        # Let's allow Org Admin too if organization_id matches.
        
        alert = await self.get_alert_by_id(alert_id, user)
        if not alert:
             raise HTTPException(status_code=404, detail="Alert not found")

        is_authorized = False
        if user.role == "admin":
             is_authorized = True
        elif user.organization_id and user.org_role == "org_admin" and alert.organization_id == user.organization_id:
             is_authorized = True
             
        if not is_authorized:
             raise HTTPException(status_code=403, detail="Not authorized to delete alerts")
             
        await db.client[db.db.name][self.collection_name].delete_one({"_id": ObjectId(alert_id)})
        await self._log_audit("alert_deleted", user.id, alert_id, True)
        return {"message": "Alert deleted"}

    async def get_summary(self, user: UserResponse) -> AlertSummary:
        match_stage = {}
        if user.role != "admin": # System Admin
             if user.organization_id:
                  match_stage["organization_id"] = user.organization_id
             else:
                  match_stage["owner_id"] = user.id
            
        pipeline = [
            {"$match": match_stage},
            {"$group": {
                "_id": None,
                "total_alerts": {"$sum": 1},
                "critical": {"$sum": {"$cond": [{"$eq": ["$severity", "critical"]}, 1, 0]}},
                "unacknowledged": {"$sum": {"$cond": [{"$eq": ["$is_acknowledged", False]}, 1, 0]}},
                "today": {"$sum": {"$cond": [{
                    "$gte": ["$created_at", datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)]
                }, 1, 0]}}
            }}
        ]
        
        result = await db.client[db.db.name][self.collection_name].aggregate(pipeline).to_list(length=1)
        
        if not result:
            return AlertSummary(total_alerts=0, critical=0, today=0, unacknowledged=0)
            
        data = result[0]
        return AlertSummary(
            total_alerts=data.get("total_alerts", 0),
            critical=data.get("critical", 0),
            today=data.get("today", 0),
            unacknowledged=data.get("unacknowledged", 0)
        )

alert_service = AlertService()
