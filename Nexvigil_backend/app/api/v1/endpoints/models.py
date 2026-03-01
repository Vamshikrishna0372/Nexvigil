from fastapi import APIRouter, Depends, Query, Path
from typing import List, Optional
from app.api import deps
from app.schemas.user import UserResponse
from app.schemas.response import BaseResponse
from app.schemas.model import ModelCreate, ModelResponse
from app.services.model_service import model_service
from app.core.limiter import limiter
from app.core.config import settings

router = APIRouter()

@router.post("/", response_model=BaseResponse[ModelResponse])
async def register_model(
    model_in: ModelCreate,
    current_user: UserResponse = Depends(deps.get_current_admin_user)
):
    """
    Register a new custom AI model (Admin).
    """
    model = await model_service.create_model(model_in)
    return BaseResponse(
        success=True,
        message="Model registered successfully",
        data=model
    )

@router.get("/", response_model=BaseResponse[List[ModelResponse]])
async def list_models(
    limit: int = 50,
    current_user: UserResponse = Depends(deps.get_current_admin_user)
):
    """
    List all models (Admin).
    """
    models = await model_service.get_models(limit)
    return BaseResponse(
        success=True,
        message="Models listed",
        data=models
    )

@router.post("/{model_id}/activate", response_model=BaseResponse[ModelResponse])
async def activate_model(
    model_id: str,
    current_user: UserResponse = Depends(deps.get_current_admin_user)
):
    """
    Set active AI model dynamically (Admin).
    """
    active = await model_service.activate_model(model_id)
    return BaseResponse(
        success=True,
        message="Model activated successfully",
        data=active
    )
