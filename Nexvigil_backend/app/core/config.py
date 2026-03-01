from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List, Optional
import os

class Settings(BaseSettings):
    APP_NAME: str = "Nexvigil"
    ENVIRONMENT: str = "development"
    MONGO_URI: str
    SECRET_KEY: str

    # NGROK public URL (set this when ngrok is running)
    # Example: https://abc123.ngrok-free.app
    NGROK_URL: Optional[str] = None

    # Your Vercel frontend URL (no trailing slash)
    # Example: https://nexvigil.vercel.app
    FRONTEND_URL: Optional[str] = None

    # Static CORS origins (always included)
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8080",
    ]

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

    MEDIA_DIR: str = "media"
    MAX_STORAGE_PER_USER_MB: int = 2048

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
        return list(set(origins))  # deduplicate

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings():
    return Settings()


settings = get_settings()
