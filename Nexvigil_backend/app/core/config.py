from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List, Optional
import os

class Settings(BaseSettings):
    APP_NAME: str = "Nexvigil"
    ENVIRONMENT: str = "development"
    MONGO_URI: str
    SECRET_KEY: str
    GEMINI_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None


    # Backend URL
    BACKEND_URL: str = "http://localhost:8000"

    # NGROK public URL (set this when ngrok is running)
    # Example: https://abc123.ngrok-free.app
    NGROK_URL: Optional[str] = None

    # Your Vercel frontend URL (no trailing slash)
    # Example: https://nexvigil.vercel.app
    FRONTEND_URL: Optional[str] = None

    # Static CORS origins (will be populated via env)
    CORS_ORIGINS: List[str] = []

    LOG_LEVEL: str = "INFO"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    INTERNAL_API_KEY: str
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    SMTP_FROM_EMAIL: str = "noreply@nexvigil.com"

    # Rate Limits (can be overridden by env)
    RATE_LIMIT_LOGIN: str = "5/minute"
    RATE_LIMIT_ALERTS: str = "60/minute"
    RATE_LIMIT_ANALYTICS: str = "100/minute"

    MEDIA_DIR: str = "uploads"
    MAX_STORAGE_PER_USER_MB: int = 2048

    @property
    def BASE_URL(self) -> str:
        """Determines the correct base URL for API and Media."""
        # Prefer NGROK_URL if explicitly set for tunneling
        if self.NGROK_URL:
            return self.NGROK_URL.rstrip("/")
        # Fallback to BACKEND_URL from settings (.env)
        return self.BACKEND_URL.rstrip("/")

    @property
    def all_cors_origins(self) -> List[str]:
        """
        Returns the full dynamic CORS origins list combining:
        - Static localhost origins
        - NGROK public URL (if running)
        - Vercel frontend URL (if deployed)
        """
        origins = list(self.CORS_ORIGINS)
        if self.NGROK_URL:
            origins.append(self.NGROK_URL.rstrip("/"))
        if self.FRONTEND_URL:
            origins.append(self.FRONTEND_URL.rstrip("/"))
        # Hardcoded safety for common Vercel/Local patterns if needed
        # origins.append("https://nexvigil.vercel.app") 
        return list(set(origins))  # deduplicate

    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "ignore" # STOPS SHUTDOWN ON UNRECOGNIZED ENV VARS (Pydantic V2 Fix)
    }


@lru_cache()
def get_settings():
    return Settings()


settings = get_settings()
