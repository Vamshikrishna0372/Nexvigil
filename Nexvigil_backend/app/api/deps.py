from typing import Annotated
from fastapi import Depends, HTTPException, Header, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from app.core.config import settings
from app.services.user_service import user_service
from app.schemas.user import Token, UserResponse

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]) -> UserResponse:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        role: str = payload.get("role")
        if user_id is None:
            raise credentials_exception
        
        user = await user_service.get_user_by_id(user_id)
        
        if user is None:
             raise credentials_exception
        
        # PROVIDE FALLBACKS FOR MISSING FIELDS (Stops 500/ValidationError)
        user["name"] = user.get("name") or user.get("displayName") or user.get("email", "").split("@")[0] or "NexVigil User"
        user["role"] = user.get("role") or "user"
        user["status"] = user.get("status") or "active"

        if user.get("status") != "active":
             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")
             
        user["id"] = str(user["_id"])
        
        # log for debugging validation errors
        print(f"✅ Auth Sync SUCCESS: {user.get('email')} [Role: {user.get('role')}]")
        
        return UserResponse(**user)
        
    except JWTError:
        raise credentials_exception

async def get_current_active_user(
    current_user: Annotated[UserResponse, Depends(get_current_user)]
) -> UserResponse:
    # Status check already done in get_current_user
    return current_user

async def get_current_admin_user(
    current_user: Annotated[UserResponse, Depends(get_current_user)]
) -> UserResponse:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="The user doesn't have enough privileges"
        )
    return current_user

async def validate_internal_api_key(
    x_api_key: Annotated[str, Header()]
):
    """
    Validate internal API key for AI agent communication.
    """
    if x_api_key != settings.INTERNAL_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid Internal API Key"
        )
    return True
