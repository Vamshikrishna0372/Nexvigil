from fastapi import APIRouter, Depends
from app.api import deps
from app.schemas.user import UserResponse
from app.schemas.response import BaseResponse

router = APIRouter()

@router.get("/admin/test", response_model=BaseResponse[str])
async def test_admin_route(current_user: UserResponse = Depends(deps.get_current_admin_user)):
    return BaseResponse(
        success=True,
        message="Admin route accessed successfully",
        data=f"Hello Admin {current_user.name}"
    )

@router.get("/user/test", response_model=BaseResponse[str])
async def test_user_route(current_user: UserResponse = Depends(deps.get_current_active_user)):
    return BaseResponse(
        success=True,
        message="User route accessed successfully",
        data=f"Hello User {current_user.name}"
    )
