from app.db.mongodb import db
from app.schemas.organization import OrganizationCreate, OrganizationUpdate, OrganizationResponse, SubscriptionPlan
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import HTTPException
from typing import Optional, List

# Define Plans (Hardcoded for now, could be in DB)
PLANS = {
    "free": SubscriptionPlan(plan_name="free", max_cameras=10, max_storage_gb=5, max_users=5, analytics_enabled=True),
    "pro": SubscriptionPlan(plan_name="pro", max_cameras=10, max_storage_gb=50, max_users=5, analytics_enabled=True),
    "enterprise": SubscriptionPlan(plan_name="enterprise", max_cameras=100, max_storage_gb=1000, max_users=50, analytics_enabled=True, custom_model_enabled=True)
}

class OrganizationService:
    collection_name = "organizations"
    
    async def create_organization(self, org_in: OrganizationCreate, owner_id: str) -> OrganizationResponse:
        data = org_in.model_dump()
        data["owner_user_id"] = owner_id
        data["created_at"] = datetime.now(timezone.utc)
        data["updated_at"] = datetime.now(timezone.utc)
        data["status"] = "active"
        
        # Apply plan defaults
        plan = PLANS.get(data.get("subscription_plan", "free"), PLANS["free"])
        data["max_cameras"] = plan.max_cameras
        data["max_storage_gb"] = plan.max_storage_gb
        
        result = await db.client[db.db.name][self.collection_name].insert_one(data)
        
        # Update owner user with org_id and role
        await db.client[db.db.name]["users"].update_one(
            {"_id": ObjectId(owner_id)},
            {"$set": {"organization_id": str(result.inserted_id), "org_role": "org_admin"}}
        )
        
        data["id"] = str(result.inserted_id)
        data["_id"] = result.inserted_id
        return OrganizationResponse(**data)
        
    async def get_org_by_id(self, org_id: str) -> Optional[OrganizationResponse]:
        try:
            oid = ObjectId(org_id)
        except:
            return None
        org = await db.client[db.db.name][self.collection_name].find_one({"_id": oid})
        if not org:
            return None
        org["id"] = str(org["_id"])
        return OrganizationResponse(**org)

    async def check_quota(self, org_id: str, resource: str):
        """
        Check if org has reached limit for 'cameras' or 'users'.
        Raises HTTPException if limit reached.
        """
        org = await self.get_org_by_id(org_id)
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")
            
        if resource == "cameras":
            count = await db.client[db.db.name]["cameras"].count_documents({"organization_id": org_id})
            if count >= org.max_cameras:
                 raise HTTPException(status_code=403, detail=f"Camera limit reached for {org.subscription_plan} plan. Upgrade to add more.")
                 
        elif resource == "users":
            count = await db.client[db.db.name]["users"].count_documents({"organization_id": org_id})
            # Plan limits for users might be in PLANS config
            plan = PLANS.get(org.subscription_plan, PLANS["free"])
            if count >= plan.max_users:
                 raise HTTPException(status_code=403, detail=f"User limit reached for {org.subscription_plan} plan.")

    async def get_all_organizations(self, limit: int = 50) -> List[OrganizationResponse]:
        cursor = db.client[db.db.name][self.collection_name].find().sort("created_at", -1).limit(limit)
        orgs = await cursor.to_list(limit)
        for o in orgs:
            o["id"] = str(o["_id"])
        return [OrganizationResponse(**o) for o in orgs]

organization_service = OrganizationService()
