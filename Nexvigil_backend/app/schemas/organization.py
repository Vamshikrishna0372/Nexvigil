from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime

class SubscriptionPlan(BaseModel):
    plan_name: str # free, pro, enterprise
    max_cameras: int
    max_storage_gb: int
    max_users: int
    analytics_enabled: bool = False
    custom_model_enabled: bool = False

class OrganizationBase(BaseModel):
    organization_name: str
    subscription_plan: str = "free"
    
class OrganizationCreate(OrganizationBase):
    pass # owner_user_id will be assigned from creator or passed explicitly if admin creates

class OrganizationUpdate(BaseModel):
    organization_name: Optional[str] = None
    subscription_plan: Optional[str] = None
    status: Optional[str] = None # active, suspended

class OrganizationResponse(OrganizationBase):
    id: str = Field(alias="_id")
    owner_user_id: str
    status: str = "active"
    created_at: datetime
    updated_at: datetime
    
    # Quotas (calculated or stored)
    max_cameras: int = 5
    max_storage_gb: int = 5
    
    class Config:
        populate_by_name = True
        from_attributes = True

class InviteUser(BaseModel):
    email: EmailStr
    org_role: str = "viewer" # org_admin, security_officer, viewer
