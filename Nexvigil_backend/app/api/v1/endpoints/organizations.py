from fastapi import APIRouter, Depends, Query, Path
from typing import List, Optional
from app.api import deps
from app.schemas.user import UserResponse
from app.schemas.response import BaseResponse
from app.schemas.organization import OrganizationCreate, OrganizationResponse
from app.services.organization_service import organization_service
from app.core.limiter import limiter
from app.core.config import settings

router = APIRouter()

@router.post("/", response_model=BaseResponse[OrganizationResponse])
async def create_organization(
    org_in: OrganizationCreate,
    current_user: UserResponse = Depends(deps.get_current_active_user)
):
    """
    Create a new organization (User becomes Org Admin).
    """
    # Check if user already in org? Usually 1 user = 1 org in simple SaaS
    if current_user.organization_id:
        # For simplicity, multiple orgs per user is complex. Restrict to 1 for now or allow switching.
        # Prompt says "Each user must belong to one organization".
        raise HTTPException(status_code=400, detail="User already belongs to an organization")
        
    org = await organization_service.create_organization(org_in, current_user.id)
    return BaseResponse(
        success=True,
        message="Organization created successfully",
        data=org
    )

@router.get("/", response_model=BaseResponse[List[OrganizationResponse]])
async def list_organizations(
    limit: int = 50,
    current_user: UserResponse = Depends(deps.get_current_admin_user)
):
    """
    List all organizations (System Admin).
    """
    orgs = await organization_service.get_all_organizations(limit)
    return BaseResponse(
        success=True,
        message="Organizations listed",
        data=orgs
    )

@router.get("/me", response_model=BaseResponse[OrganizationResponse])
async def get_my_organization(
    current_user: UserResponse = Depends(deps.get_current_active_user)
):
    """
    Get current user's organization.
    """
    if not current_user.organization_id:
         raise HTTPException(status_code=404, detail="No organization found")
         
    org = await organization_service.get_org_by_id(current_user.organization_id)
    return BaseResponse(
        success=True,
        message="Organization details retrieved",
        data=org
    )

from fastapi import HTTPException
