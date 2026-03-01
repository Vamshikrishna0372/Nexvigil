from datetime import datetime, timezone
from typing import Optional, List
from app.db.mongodb import db
from app.schemas.ai import AIConfigCreate, AIConfigResponse, AIPerformanceMetric

class AIService:
    config_collection = "ai_config"
    metrics_collection = "ai_performance"
    
    async def get_config(self) -> AIConfigResponse:
        config = await db.client[db.db.name][self.config_collection].find_one({})
        if not config:
            # Create default
            new_config = {
                "model_type": "yolov8n",
                "confidence_threshold": 0.5,
                "frame_skip": 5,
                "recording_persistence_seconds": 3,
                "cool_down_seconds": 30,
                "max_parallel_cameras": 4,
                "use_gpu": False,
                "email_notifications_enabled": True,
                "recipient_email": "nagulakrish21@gmail.com",
                "email_cooldown_minutes": 5,
                "email_daily_limit": 400,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            res = await db.client[db.db.name][self.config_collection].insert_one(new_config)
            new_config["id"] = str(res.inserted_id)
            new_config["_id"] = str(res.inserted_id)
            return AIConfigResponse(**new_config)
            
        config["id"] = str(config["_id"])
        config["_id"] = str(config["_id"])
        return AIConfigResponse(**config)
    
    async def update_config(self, config_in: AIConfigCreate) -> AIConfigResponse:
        await self.get_config() # Ensure exists
        
        update_data = config_in.model_dump()
        update_data["updated_at"] = datetime.now(timezone.utc)
        
        await db.client[db.db.name][self.config_collection].update_one(
            {},
            {"$set": update_data}
        )
        
        return await self.get_config()
        
    async def record_metrics(self, metric: AIPerformanceMetric):
        data = metric.model_dump()
        await db.client[db.db.name][self.metrics_collection].insert_one(data)
        
    async def get_latest_metrics(self, camera_id: str = None) -> List[AIPerformanceMetric]:
        query = {}
        if camera_id:
            query["camera_id"] = camera_id
            
        cursor = db.client[db.db.name][self.metrics_collection].find(query).sort("timestamp", -1).limit(50)
        metrics = await cursor.to_list(50)
        return [AIPerformanceMetric(**m) for m in metrics]

ai_service = AIService()
