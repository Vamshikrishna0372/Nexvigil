from datetime import datetime, timedelta, timezone
from typing import List, Optional
from app.db.mongodb import db
from app.schemas.anomaly import AnomalyEvent, AnomalySummary
import logging

logger = logging.getLogger(__name__)

class AnomalyService:
    collection_name = "anomaly_events"
    alerts_collection = "alerts"
    
    async def record_anomaly(self, event: AnomalyEvent):
        data = event.model_dump()
        await db.client[db.db.name][self.collection_name].insert_one(data)
        logger.warning(f"Anomaly Detected: {event.anomaly_type} (Score: {event.anomaly_score}) - {event.details}")

    async def check_spike_anomaly(self, camera_id: str, org_id: Optional[str]):
        """
        Check ifalerts spike > X in last Y mins.
        Simple Logic: > 10 alerts in 5 mins.
        """
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=5)
        count = await db.client[db.db.name][self.alerts_collection].count_documents({
            "camera_id": camera_id,
            "created_at": {"$gte": cutoff}
        })
        
        if count > 10:
             # Escalation
             score = min(100, 50 + (count - 10) * 5)
             severity = "moderate"
             if score > 80: severity = "critical"
             elif score > 60: severity = "high"
             
             event = AnomalyEvent(
                 camera_id=camera_id,
                 organization_id=org_id,
                 anomaly_type="spike_detection",
                 anomaly_score=score,
                 details=f"Alert spike detected: {count} alerts in last 5 minutes.",
                 severity=severity,
                 created_at=datetime.utcnow()
             )
             await self.record_anomaly(event)

    async def check_time_based_anomaly(self, camera_id: str, org_id: Optional[str]):
        """
        Check if detection is during quiet hours (e.g., 11 PM - 5 AM).
        Hardcoded for demo, ideally configurable.
        """
        now = datetime.now(timezone.utc)
        hour = now.hour
        
        # Assume restricted: 23-05
        if hour >= 23 or hour < 5:
             event = AnomalyEvent(
                 camera_id=camera_id,
                 organization_id=org_id,
                 anomaly_type="restricted_hours",
                 anomaly_score=90.0,
                 details=f"Activity detected during restricted hours ({hour}:00 UTC).",
                 severity="critical",
                 created_at=datetime.utcnow()
             )
             await self.record_anomaly(event)

    async def get_summary(self, org_id: Optional[str] = None) -> AnomalySummary:
        query = {}
        if org_id:
             query["organization_id"] = org_id
             
        total = await db.client[db.db.name][self.collection_name].count_documents(query)
        critical = await db.client[db.db.name][self.collection_name].count_documents({**query, "severity": "critical"})
        
        cursor = db.client[db.db.name][self.collection_name].find(query).sort("created_at", -1).limit(10)
        events = await cursor.to_list(10)
        
        return AnomalySummary(
            total_anomalies=total,
            critical_anomalies=critical,
            recent_events=[AnomalyEvent(**e) for e in events]
        )

anomaly_service = AnomalyService()
