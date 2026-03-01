from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from app.api import deps
from app.schemas.user import UserCreate, UserLogin, Token, UserResponse
from app.services.user_service import user_service
from app.schemas.response import BaseResponse
from app.core.limiter import limiter
from app.core.config import settings

router = APIRouter()

from app.utils import serialize_mongo

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    request: Request,
    user_in: UserCreate
):
    """
    Register a new user.
    """
    user = await user_service.create_user(user_in)
    return BaseResponse(
        success=True,
        message="User registered successfully",
        data=serialize_mongo(user)
    )

@router.post("/login", response_model=Token)
@limiter.limit(settings.RATE_LIMIT_LOGIN)
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends()
):
    """
    Login user and return JWT token.
    """
    # Create UserLogin schema on the fly from form data
    user_in = UserLogin(email=form_data.username, password=form_data.password)
    token = await user_service.authenticate_user(user_in)
    return token

@router.get("/me")
async def read_users_me(current_user: UserResponse = Depends(deps.get_current_active_user)):
    """
    Get current logged in user.
    """
    return BaseResponse(
        success=True,
        message="User details retrieved",
        data=serialize_mongo(current_user)
    )

from app.schemas.user import UserUpdate

@router.put("/me")
async def update_users_me(
    user_in: UserUpdate,
    current_user: UserResponse = Depends(deps.get_current_active_user)
):
    """
    Update current logged in user.
    """
    updated_user = await user_service.update_user(current_user.id, user_in)
    return BaseResponse(
        success=True,
        message="User updated successfully",
        data=serialize_mongo(updated_user)
    )
