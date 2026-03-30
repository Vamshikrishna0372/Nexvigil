from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse, RedirectResponse
import httpx
import logging
from app.api import deps
from app.schemas.user import UserCreate, UserLogin, Token, UserResponse
from app.services.user_service import user_service
from app.schemas.response import BaseResponse
from app.core.limiter import limiter
from app.core.config import settings

logger = logging.getLogger(__name__)

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

# --- GOOGLE OAUTH PROXY ROUTES ---

@router.get("/google/login", tags=["Google Auth"])
async def google_login(request: Request):
    """Proxy the login init request to the internal Node.js auth server"""
    # Get frontend origin to support both localhost and production
    from urllib.parse import urlparse, quote
    origin = request.query_params.get("origin") or request.headers.get("origin") or request.headers.get("referer", "")
    
    # Simple URL parse to get base origin if referer is a full path
    if origin:
        parsed = urlparse(origin)
        origin = f"{parsed.scheme}://{parsed.netloc}"
    else:
        # Fallback to frontend URL from settings if absolutely no origin found
        origin = settings.FRONTEND_URL or "http://localhost:5173"

    async with httpx.AsyncClient(follow_redirects=False) as client:
        try:
            # We proxy to the Node server on 8081
            url = f"http://localhost:8081/auth/google?origin={quote(origin, safe='')}"
            headers = {
                "X-Forwarded-Host": request.headers.get("host", request.url.hostname),
                "X-Forwarded-Proto": request.headers.get("x-forwarded-proto", request.url.scheme),
            }
            response = await client.get(url, headers=headers)
            google_url = response.headers.get("location")
            if google_url:
                return RedirectResponse(url=google_url, status_code=302)
        except Exception as e:
            logger.error(f"Auth Proxy Error: {e}")
        
    frontend_login = f"{origin}/login" if origin else f"{settings.FRONTEND_URL or 'http://localhost:5173'}/login"
    return RedirectResponse(
        url=f"{frontend_login}?error=auth_proxy_down", 
        status_code=302
    )

@router.get("/google/callback", tags=["Google Auth"])
async def google_callback(request: Request):
    """Proxy the callback from Google back to the internal Node.js auth server"""
    async with httpx.AsyncClient(follow_redirects=False) as client:
        try:
            url = f"http://localhost:8081/auth/google/callback?{request.url.query}"
            headers = {
                "Cookie": request.headers.get("cookie", ""),
                "X-Forwarded-Host": request.headers.get("host", request.url.hostname),
                "X-Forwarded-Proto": request.headers.get("x-forwarded-proto", request.url.scheme),
            }
            response = await client.get(url, headers=headers)
            redirect_target = response.headers.get("location")
            if redirect_target:
                # We need to relay the cookie that Node tries to set back to the client
                final_response = RedirectResponse(url=redirect_target, status_code=302)
                if "set-cookie" in response.headers:
                    final_response.headers["set-cookie"] = response.headers["set-cookie"]
                return final_response
            
            # If no redirect is given, return the text
            return JSONResponse(status_code=response.status_code, content={"message": "Callback processed", "data": response.text})
        except Exception as e:
            logger.error(f"Auth Proxy Error: {e}")

    frontend_login = f"{settings.FRONTEND_URL or 'http://localhost:5173'}/login"
    return RedirectResponse(
        url=f"{frontend_login}?error=auth_proxy_down_callback", 
        status_code=302
    )

@router.get("/user", tags=["Google Auth"])
async def auth_user_proxy(request: Request):
    """Proxy the user info request to the internal Node.js auth server"""
    async with httpx.AsyncClient() as client:
        try:
            url = f"http://localhost:8081/auth/user"
            headers = {
                "Cookie": request.headers.get("cookie", ""),
                "ngrok-skip-browser-warning": "true"
            }
            response = await client.get(url, headers=headers)
            return JSONResponse(status_code=response.status_code, content=response.json())
        except Exception as e:
            logger.error(f"Auth Proxy Error: {e}")
            return JSONResponse(status_code=503, content={"authenticated": False, "error": "Auth service unavailable"})

@router.get("/logout", tags=["Google Auth"])
async def auth_logout_proxy(request: Request):
    """Proxy the logout request to the internal Node.js auth server"""
    async with httpx.AsyncClient() as client:
        try:
            url = f"http://localhost:8081/logout"
            headers = {"Cookie": request.headers.get("cookie", "")}
            response = await client.get(url, headers=headers)
            # Redirect back to frontend login
            origin = request.headers.get("origin") or request.headers.get("referer", "")
            if origin:
                from urllib.parse import urlparse
                parsed = urlparse(origin)
                origin = f"{parsed.scheme}://{parsed.netloc}"
            
            frontend_login = f"{origin}/login" if origin else f"{settings.FRONTEND_URL or 'http://localhost:5173'}/login"
            return RedirectResponse(url=frontend_login, status_code=302)
        except Exception as e:
            logger.error(f"Auth Proxy Error: {e}")
            return RedirectResponse(url="/login", status_code=302)
