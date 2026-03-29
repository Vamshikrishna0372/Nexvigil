from app.db.mongodb import db
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict
import logging

logger = logging.getLogger(__name__)

class AnalyticsService:
    async def get_alert_analytics(self, user_id: str, is_admin: bool, 
                                  start_date: Optional[datetime], end_date: Optional[datetime],
                                  camera_id: Optional[str] = None,
                                  severity: Optional[str] = None) -> dict:
        
        match_stage = {}
        if not is_admin:
            match_stage["owner_id"] = user_id
            
        if start_date and end_date:
            match_stage["created_at"] = {"$gte": start_date, "$lte": end_date}
        elif start_date:
            match_stage["created_at"] = {"$gte": start_date}
            
        if camera_id:
            match_stage["camera_id"] = camera_id
        if severity:
            match_stage["severity"] = severity

        # Total count
        total_count = await db.db["alerts"].count_documents(match_stage)

        # Severity Breakdown
        severity_pipeline = [
            {"$match": match_stage},
            {"$group": {"_id": "$severity", "count": {"$sum": 1}}}
        ]
        severity_results = await db.db["alerts"].aggregate(severity_pipeline).to_list(None)
        severity_map = {item["_id"]: item["count"] for item in severity_results}
        
        # By Day
        day_pipeline = [
            {"$match": match_stage},
            {"$project": {
                "day": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                "severity": 1
            }},
            {"$group": {
                "_id": "$day", 
                "count": {"$sum": 1},
                "critical": {"$sum": {"$cond": [{"$eq": ["$severity", "critical"]}, 1, 0]}}
            }},
            {"$sort": {"_id": 1}}
        ]
        day_results = await db.db["alerts"].aggregate(day_pipeline).to_list(None)
        days = [{"date": item["_id"], "count": item["count"], "critical": item.get("critical", 0)} for item in day_results]
        
        # By Camera
        camera_pipeline = [
            {"$match": match_stage},
            {"$group": {"_id": "$camera_id", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 50} 
        ]
        camera_results = await db.db["alerts"].aggregate(camera_pipeline).to_list(None)
        cameras = [{"camera_id": str(item["_id"]), "count": item["count"]} for item in camera_results]
        
        # By Object (New: strictly real data)
        object_pipeline = [
            {"$match": match_stage},
            {"$group": {"_id": "$object_detected", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        object_results = await db.db["alerts"].aggregate(object_pipeline).to_list(None)
        objects = [{"object": item["_id"], "count": item["count"]} for item in object_results]

        # Ensure severity dict complete
        full_severity = {
            "low": severity_map.get("low", 0),
            "medium": severity_map.get("medium", 0),
            "high": severity_map.get("high", 0),
            "critical": severity_map.get("critical", 0),
        }
        
        return {
            "total_count": total_count,
            "alerts_by_severity": full_severity,
            "alerts_by_day": days,
            "alerts_by_camera": cameras,
            "alerts_by_object": objects
        }

    async def calculate_risk_score(self, user_id: str, is_admin: bool) -> dict:
        # Risk Formula: (critical_alerts * 5) + (high_alerts * 3) + (medium_alerts * 2) + (low_alerts * 1)
        # Context: Unacknowledged Alerts (Active Threats)
        match_stage = {"is_acknowledged": False}
        if not is_admin:
            match_stage["owner_id"] = user_id

        pipeline = [
            {"$match": match_stage},
            {"$group": {
                "_id": None,
                "critical": {"$sum": {"$cond": [{"$eq": ["$severity", "critical"]}, 1, 0]}},
                "high": {"$sum": {"$cond": [{"$eq": ["$severity", "high"]}, 1, 0]}},
                "medium": {"$sum": {"$cond": [{"$eq": ["$severity", "medium"]}, 1, 0]}},
                "low": {"$sum": {"$cond": [{"$eq": ["$severity", "low"]}, 1, 0]}}
            }}
        ]
        
        result = await db.db["alerts"].aggregate(pipeline).to_list(1)
        
        if not result:
            return {"risk_score": 0, "risk_level": "Low"}
            
        data = result[0]
        raw_score = (data["critical"] * 5) + (data["high"] * 3) + (data["medium"] * 2) + (data["low"] * 1)
        
        # Normalize 0-100 logic: Cap at 100 for display, or define max threshold e.g. 50
        # Given 5 critical alerts = 25 score. 20 critical = 100 which is very high risk.
        # Let's simple cap at 100.
        normalized_score = min(100, raw_score)
        
        risk_level = "Low"
        if normalized_score >= 80:
            risk_level = "Critical"
        elif normalized_score >= 50:
            risk_level = "High"
        elif normalized_score >= 20:
            risk_level = "Moderate"
            
        return {"risk_score": normalized_score, "risk_level": risk_level}

    async def get_ai_performance(self) -> dict:
        # Fetch latest from AI Metrics collection
        # Assuming only 1 global metrics doc or latest one.
        # Collection 'ai_performance'
        latest = await db.db["ai_performance"]\
            .find().sort("last_updated", -1).limit(1).to_list(1)
            
        if not latest:
            return {
                "total_detections": 0,
                "average_confidence": 0.0,
                "model_status": "stopped", # Default if no data
                "avg_processing_time_ms": 0.0,
                "false_positive_estimate": 0.0
            }
        
        metric = latest[0]
        metric["id"] = str(metric["_id"])
        return metric

    async def record_ai_metrics(self, metrics: dict):
        metrics["last_updated"] = datetime.now(timezone.utc)
        await db.db["ai_performance"].insert_one(metrics)
        # Also store time-series ?
        # "Time-series data aggregation... Used for: Chart plotting... GET /analytics/trends"
        # Yes, we should store simplified version in 'timestamped_stats' collection
        ts_entry = {
            "metric_type": "ai_performance",
            "value": metrics["processing_fps"], # Example: track FPS trend
            "timestamp": datetime.now(timezone.utc)
        }
        await db.db["time_series_stats"].insert_one(ts_entry)

    async def get_camera_health(self, user_id: str, is_admin: bool) -> dict:
        query = {}
        if not is_admin:
            query["owner_id"] = user_id
            
        pipeline = [
            {"$match": query},
            {"$group": {
                "_id": None,
                "online": {"$sum": {"$cond": [{"$eq": ["$health_status", "online"]}, 1, 0]}},
                "total": {"$sum": 1},
                # Assuming uptime calculation needs history, simplicity: "online" count / total
                # Or based on Last Active? If last_active < 5 mins ago => online.
                # Actually, status field is maintained by heartbeat.
            }}
        ]
        result = await db.db["cameras"].aggregate(pipeline).to_list(1)
        
        if not result:
            return {"online_cameras": 0, "offline_cameras": 0, "average_uptime_percentage": 0.0}
            
        data = result[0]
        online = data.get("online", 0)
        total = data.get("total", 0)
        offline = total - online
        uptime = (online / total * 100) if total > 0 else 0.0
        
        return {
            "online_cameras": online, 
            "offline_cameras": offline, 
            "average_uptime_percentage": round(uptime, 2)
        }

    async def get_system_overview(self) -> dict:
        # Admin only aggregate
        total_users = await db.db["users"].count_documents({})
        total_cameras = await db.db["cameras"].count_documents({})
        total_alerts = await db.db["alerts"].count_documents({})
        
        # Risk Score (System Wide)
        risk = await self.calculate_risk_score(None, True)
        
        # AI Status
        settings_doc = await db.db["system_settings"].find_one({})
        configured_status = settings_doc.get("ai_engine_status", "stopped") if settings_doc else "stopped"
        
        # Check actual heartbeat
        latest_metric = await self.get_ai_performance()
        if configured_status == "running":
            last_ping = latest_metric.get("last_updated") # This comes from get_ai_performance which reads DB
            # Wait, get_ai_performance returns dict with last_updated.
            # But get_ai_performance handles "no data" case.
            # And it might return string or datetime depending on how motor returns it? Motor returns datetime.
            # But schema has datetime.
            if last_ping:
                if (datetime.now(timezone.utc) - last_ping).total_seconds() > 60:
                     ai_status = "stalled"
                else:
                     ai_status = "running"
            else:
                ai_status = "unknown"
        else:
             ai_status = "stopped"
        
        return {
            "total_users": total_users,
            "total_cameras": total_cameras,
            "total_alerts": total_alerts,
            "storage_used_total_mb": (await db.db["storage_stats"].aggregate([{"$group": {"_id": None, "total": {"$sum": "$used_storage_mb"}}}]).to_list(1))[0]["total"] if await db.db["storage_stats"].count_documents({}) > 0 else 0.0,
            "system_risk_score": risk["risk_score"],
            "ai_engine_status": ai_status
        }

    async def track_time_series(self, metric_type: str, value: float):
        entry = {
            "metric_type": metric_type,
            "value": value,
            "timestamp": datetime.now(timezone.utc)
        }
        await db.db["time_series_stats"].insert_one(entry)
        
    async def get_trends(self, metric_type: str, days: int = 7, user_id: str = None, is_admin: bool = True) -> list:
        start_date = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=days-1)
        
        if metric_type == "alerts":
            # Dynamically aggregate alerts by day
            match_stage = {"created_at": {"$gte": start_date}}
            if not is_admin and user_id:
                match_stage["owner_id"] = user_id
                
            pipeline = [
                {"$match": match_stage},
                {"$group": {
                    "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                    "value": {"$sum": 1}
                }},
                {"$sort": {"_id": 1}}
            ]
            results = await db.db["alerts"].aggregate(pipeline).to_list(None)
            
            # Fill gaps for days with zero alerts
            trends_map = {r["_id"]: r["value"] for r in results}
            full_trends = []
            for i in range(days):
                d = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
                full_trends.append({
                    "timestamp": d, # Frontend expects 'day' or 'timestamp'? 
                                   # useDashboardData transforms this, but let's be safe.
                    "day": d, 
                    "value": trends_map.get(d, 0),
                    "alerts": trends_map.get(d, 0)
                })
            return full_trends
            
        # Fallback for other metrics
        query = {"metric_type": metric_type, "timestamp": {"$gte": start_date}}
        if not is_admin and user_id:
             query["user_id"] = user_id
             
        cursor = db.db["time_series_stats"].find(query).sort("timestamp", 1)
        data = await cursor.to_list(None)
        return [{"timestamp": d["timestamp"].isoformat() if isinstance(d.get("timestamp"), datetime) else str(d.get("timestamp", "")), "value": d["value"]} for d in data]

analytics_service = AnalyticsService()
