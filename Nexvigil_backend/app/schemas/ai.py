from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class AIConfigBase(BaseModel):
    model_type: str = "yolov8n" # yolov8n, yolov8s, yolov8m
    confidence_threshold: float = 0.5
    frame_skip: int = 5 # Process every 5th frame
    recording_persistence_seconds: int = 3 # Alert only if detection lasts 3s
    cool_down_seconds: int = 30 # Avoid duplicate alerts
    max_parallel_cameras: int = 4
    use_gpu: bool = False # Auto-detect preferred, but can force
    
    # Email alerting config
    sender_email: Optional[str] = None
    sender_app_password: Optional[str] = None
    email_notifications_enabled: bool = True
    recipient_email: str = "nagulakrish21@gmail.com"
    email_cooldown_minutes: int = 5
    email_daily_limit: int = 400

class AIConfigCreate(AIConfigBase):
    pass

class AIConfigResponse(AIConfigBase):
    id: str = Field(alias="_id")
    updated_at: datetime
    
    class Config:
        populate_by_name = True
        from_attributes = True

class AIPerformanceMetric(BaseModel):
    camera_id: str
    fps: float
    cpu_usage_percent: float
    memory_usage_mb: float
    gpu_usage_percent: Optional[float] = None
    inference_time_ms: float
    timestamp: datetime
