from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from app.api import deps
from app.schemas.user import UserResponse, UserUpdate, UserCreate
from app.schemas.response import BaseResponse
from app.services.user_service import user_service
from app.utils import serialize_mongo

router = APIRouter()

@router.get("/", response_model=BaseResponse[List[UserResponse]])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    current_user: UserResponse = Depends(deps.get_current_admin_user)
):
    """
    List all users (Admin only).
    """
    users = await user_service.get_users(skip, limit)
    return BaseResponse(
        success=True,
        message="Users listed successfully",
        data=serialize_mongo(users)
    )

@router.post("/", response_model=BaseResponse[UserResponse])
async def create_user_admin(
    user_in: UserCreate,
    current_user: UserResponse = Depends(deps.get_current_admin_user)
):
    """
    Create a new user (Admin only).
    """
    user = await user_service.create_user(user_in)
    return BaseResponse(
        success=True,
        message="User created successfully",
        data=serialize_mongo(user)
    )

@router.put("/{user_id}", response_model=BaseResponse[UserResponse])
async def update_user_admin(
    user_id: str,
    user_in: UserUpdate,
    current_user: UserResponse = Depends(deps.get_current_admin_user)
):
    """
    Update a user (Admin only).
    """
    user = await user_service.update_user(user_id, user_in)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return BaseResponse(
        success=True,
        message="User updated successfully",
        data=serialize_mongo(user)
    )

@router.delete("/{user_id}")
async def delete_user_admin(
    user_id: str,
    current_user: UserResponse = Depends(deps.get_current_admin_user)
):
    """
    Delete a user (Admin only).
    """
    success = await user_service.delete_user(user_id)
    if not success:
         raise HTTPException(status_code=404, detail="User not found")
    return BaseResponse(
        success=True,
        message="User deleted successfully"
    )
