from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime
import re

class CameraBase(BaseModel):
    camera_name: str
    camera_url: str
    location: Optional[str] = None
    description: Optional[str] = None

    @validator('camera_url')
    def validate_camera_url(cls, v):
        # Allow numeric device index
        if v.isdigit():
            if int(v) < 0:
                raise ValueError('Device index must be non-negative')
            return v
        
        # Allow RTSP or HTTP/HTTPS
        if not re.match(r"^(rtsp|http|https)://", v):
            raise ValueError('Camera URL must start with rtsp://, http://, or https:// OR be a device index (0, 1)')
        return v

    @validator('camera_name')
    def validate_name_not_empty(cls, v):
        if not v.strip():
            raise ValueError('Camera name cannot be empty')
        return v.strip()

class CameraCreate(CameraBase):
    pass

class CameraUpdate(BaseModel):
    camera_name: Optional[str] = None
    camera_url: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None

    @validator('camera_url')
    def validate_camera_url(cls, v):
        if not v:
            return v
        if v.isdigit():
            if int(v) < 0:
                 raise ValueError('Device index must be non-negative')
            return v
        if not re.match(r"^(rtsp|http|https)://", v):
             raise ValueError('Camera URL must start with rtsp://, http://, or https:// OR be a device index')
        return v

class CameraResponse(CameraBase):
    id: str = Field(alias="_id")
    owner_id: str
    status: str
    health_status: str
    fps: Optional[float] = 0.0
    telemetry: Optional[dict] = {}
    last_active: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        from_attributes = True
