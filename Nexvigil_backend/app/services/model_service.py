from datetime import datetime, timezone
from typing import List, Optional
from bson import ObjectId
from app.db.mongodb import db
from app.schemas.model import ModelCreate, ModelResponse, ActiveModelResponse
from fastapi import HTTPException, status
import logging

logger = logging.getLogger(__name__)

class ModelService:
    collection_name = "models"
    metrics_collection = "model_metrics"
    
    async def create_model(self, model_in: ModelCreate) -> ModelResponse:
        model_dict = model_in.model_dump()
        model_dict["status"] = "inactive"
        model_dict["created_at"] = datetime.now(timezone.utc)
        model_dict["updated_at"] = datetime.now(timezone.utc)
        
        result = await db.client[db.db.name][self.collection_name].insert_one(model_dict)
        
        model_dict["id"] = str(result.inserted_id)
        model_dict["_id"] = result.inserted_id
        
        return ModelResponse(**model_dict)
    
    async def get_models(self, limit: int = 50) -> List[ModelResponse]:
        cursor = db.client[db.db.name][self.collection_name].find().sort("created_at", -1).limit(limit)
        models = await cursor.to_list(limit)
        
        for m in models:
            m["id"] = str(m["_id"])
            
        return [ModelResponse(**m) for m in models]
    
    async def get_active_model(self) -> Optional[ModelResponse]:
        model = await db.client[db.db.name][self.collection_name].find_one({"status": "active"})
        if not model:
            return None
            
        model["id"] = str(model["_id"])
        return ModelResponse(**model)
    
    async def activate_model(self, model_id: str) -> ModelResponse:
        try:
            oid = ObjectId(model_id)
        except:
            raise HTTPException(status_code=400, detail="Invalid ID")
            
        target = await db.client[db.db.name][self.collection_name].find_one({"_id": oid})
        if not target:
             raise HTTPException(status_code=404, detail="Model not found")
             
        # Deactivate all others
        await db.client[db.db.name][self.collection_name].update_many(
            {},
            {"$set": {"status": "inactive", "updated_at": datetime.now(timezone.utc)}}
        )
        
        # Activate target
        await db.client[db.db.name][self.collection_name].update_one(
            {"_id": oid},
            {"$set": {"status": "active", "updated_at": datetime.now(timezone.utc)}}
        )
        
        updated = await db.client[db.db.name][self.collection_name].find_one({"_id": oid})
        updated["id"] = str(updated["_id"])
        
        # Log event (simplified log logic)
        logger.info(f"Model {model_id} activated.")
        
        return ModelResponse(**updated)

model_service = ModelService()
