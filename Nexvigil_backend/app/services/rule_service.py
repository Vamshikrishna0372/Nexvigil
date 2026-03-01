from datetime import datetime, timezone
from typing import List, Optional
from app.db.mongodb import db
from app.schemas.rule import RuleCreate, RuleUpdate
from bson import ObjectId

class RuleService:
    collection_name = "detection_rules"

    async def create_rule(self, rule_in: RuleCreate, owner_id: str) -> dict:
        data = rule_in.model_dump()
        data["owner_id"] = owner_id
        data["created_at"] = datetime.now(timezone.utc)
        data["updated_at"] = datetime.now(timezone.utc)
        
        res = await db.db[self.collection_name].insert_one(data)
        data["_id"] = str(res.inserted_id)
        return data

    async def get_rules(self, owner_id: Optional[str] = None) -> List[dict]:
        query = {"is_active": True}
        if owner_id:
            # Show user's own rules AND system rules (no owner)
            query["$and"] = [
                {"is_active": True},
                {"$or": [
                    {"owner_id": owner_id},
                    {"owner_id": {"$exists": False}},
                    {"owner_id": None},
                    {"owner_id": "system"}
                ]}
            ]
            
        cursor = db.db[self.collection_name].find(query).sort("created_at", -1)
        rules = await cursor.to_list(100)
        for r in rules:
            r["_id"] = str(r["_id"])
            r["id"] = r["_id"]
        return rules

    async def update_rule(self, rule_id: str, rule_in: RuleUpdate, owner_id: str) -> Optional[dict]:
        update_data = rule_in.model_dump(exclude_unset=True)
        update_data["updated_at"] = datetime.now(timezone.utc)
        
        query = {"_id": ObjectId(rule_id)}
        if owner_id:
             query["owner_id"] = owner_id

        res = await db.db[self.collection_name].find_one_and_update(
            query,
            {"$set": update_data},
            return_document=True
        )
        if res:
             res["_id"] = str(res["_id"])
        return res

    async def delete_rule(self, rule_id: str, owner_id: str) -> bool:
        query = {"_id": ObjectId(rule_id)}
        if owner_id:
             query["owner_id"] = owner_id
             
        res = await db.db[self.collection_name].delete_one(query)
        return res.deleted_count > 0

rule_service = RuleService()
