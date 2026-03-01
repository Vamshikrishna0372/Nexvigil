from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from app.api import deps
from app.schemas.response import BaseResponse
from app.schemas.rule import RuleCreate, RuleUpdate, RuleResponse
from app.services.rule_service import rule_service
from app.schemas.user import UserResponse

router = APIRouter()

@router.post("/", response_model=BaseResponse[RuleResponse])
async def create_rule(
    rule_in: RuleCreate,
    current_user: UserResponse = Depends(deps.get_current_active_user)
):
    """
    Create a new AI detection rule.
    """
    # If standard user, scope to them. If admin, allow maybe global?
    # For now, all rules are tied to the creator.
    rule = await rule_service.create_rule(rule_in, current_user.id)
    return BaseResponse(
        success=True,
        message="Detection rule created successfully",
        data=rule
    )

@router.get("/", response_model=BaseResponse[List[RuleResponse]])
async def list_rules(
    current_user: UserResponse = Depends(deps.get_current_active_user)
):
    """
    List all detection rules for the user.
    """
    # Admins see all, others see theirs
    owner_id = None if current_user.role == "admin" else current_user.id
    rules = await rule_service.get_rules(owner_id)
    return BaseResponse(
        success=True,
        message="Rules retrieved",
        data=rules
    )

@router.put("/{rule_id}", response_model=BaseResponse[RuleResponse])
async def update_rule(
    rule_id: str,
    rule_in: RuleUpdate,
    current_user: UserResponse = Depends(deps.get_current_active_user)
):
    """
    Update an existing rule.
    """
    owner_id = None if current_user.role == "admin" else current_user.id
    rule = await rule_service.update_rule(rule_id, rule_in, owner_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found or not owned")
    return BaseResponse(
        success=True,
        message="Rule updated",
        data=rule
    )

@router.delete("/{rule_id}")
async def delete_rule(
    rule_id: str,
    current_user: UserResponse = Depends(deps.get_current_active_user)
):
    """
    Delete a rule.
    """
    owner_id = None if current_user.role == "admin" else current_user.id
    success = await rule_service.delete_rule(rule_id, owner_id)
    if not success:
         raise HTTPException(status_code=404, detail="Rule not found or not owned")
    return BaseResponse(
        success=True,
        message="Rule deleted"
    )
