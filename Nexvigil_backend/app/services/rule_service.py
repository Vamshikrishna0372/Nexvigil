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
        data["id"] = data["_id"]
        return data

    async def get_rules(self, owner_id: Optional[str] = None) -> List[dict]:
        """Returns ALL rules (active + inactive) for the management UI."""
        query = {}
        if owner_id:
            # Show user's own rules AND system rules (no owner)
            query["$or"] = [
                {"owner_id": owner_id},
                {"owner_id": {"$exists": False}},
                {"owner_id": None},
                {"owner_id": "system"}
            ]
            
        cursor = db.db[self.collection_name].find(query).sort("created_at", -1)
        rules = await cursor.to_list(200)
        for r in rules:
            r["_id"] = str(r["_id"])
            r["id"] = r["_id"]
        return rules

    async def get_active_rules(self) -> List[dict]:
        """Used exclusively by the AI Agent — returns ONLY is_active=True rules."""
        cursor = db.db[self.collection_name].find({"is_active": True}).sort("created_at", -1)
        rules = await cursor.to_list(200)
        for r in rules:
            r["_id"] = str(r["_id"])
            r["id"] = r["_id"]
        return rules

    async def update_rule(self, rule_id: str, rule_in: RuleUpdate, owner_id: Optional[str] = None) -> Optional[dict]:
        update_data = rule_in.model_dump(exclude_unset=True)
        update_data["updated_at"] = datetime.now(timezone.utc)
        
        try:
            oid = ObjectId(rule_id)
        except Exception:
            return None

        # Admins (owner_id=None) can update any rule
        query = {"_id": oid}
        if owner_id:
            query["$or"] = [
                {"owner_id": owner_id},
                {"owner_id": "system"},
                {"owner_id": None},
                {"owner_id": {"$exists": False}}
            ]

        res = await db.db[self.collection_name].find_one_and_update(
            query,
            {"$set": update_data},
            return_document=True
        )
        if res:
            res["_id"] = str(res["_id"])
            res["id"] = res["_id"]
        return res

    async def toggle_rule(self, rule_id: str, is_active: bool, owner_id: Optional[str] = None) -> Optional[dict]:
        """Dedicated toggle endpoint — only flips the is_active field."""
        try:
            oid = ObjectId(rule_id)
        except Exception:
            return None

        query = {"_id": oid}
        if owner_id:
            query["$or"] = [
                {"owner_id": owner_id},
                {"owner_id": "system"},
                {"owner_id": None},
                {"owner_id": {"$exists": False}}
            ]

        res = await db.db[self.collection_name].find_one_and_update(
            query,
            {"$set": {"is_active": is_active, "updated_at": datetime.now(timezone.utc)}},
            return_document=True
        )
        if res:
            res["_id"] = str(res["_id"])
            res["id"] = res["_id"]
        return res

    async def delete_rule(self, rule_id: str, owner_id: Optional[str] = None) -> bool:
        try:
            oid = ObjectId(rule_id)
        except Exception:
            return False

        query = {"_id": oid}
        if owner_id:
            query["$or"] = [
                {"owner_id": owner_id},
                {"owner_id": "system"},
                {"owner_id": None},
                {"owner_id": {"$exists": False}}
            ]
             
        res = await db.db[self.collection_name].delete_one(query)
        return res.deleted_count > 0

rule_service = RuleService()
