from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class NotificationSettingsBase(BaseModel):
    in_app: bool = True
    email: bool = True
    desktop_push: bool = False
    severity_preferences: dict = {
        "low": False,
        "medium": True,
        "high": True,
        "critical": True
    }
    quiet_hours_enabled: bool = False
    quiet_hours_start: str = "22:00"
    quiet_hours_end: str = "07:00"
    email_digest_frequency: str = "instant" # instant, hourly, daily

class NotificationSettingsCreate(NotificationSettingsBase):
    pass

class NotificationSettingsResponse(NotificationSettingsBase):
    user_id: str
    updated_at: datetime
    
    class Config:
        from_attributes = True

class NotificationBase(BaseModel):
    alert_id: str
    message: str
    is_read: bool = False
    severity: str

class NotificationResponse(NotificationBase):
    id: str = Field(alias="_id")
    user_id: str
    created_at: datetime

    class Config:
        populate_by_name = True
        from_attributes = True

class NotificationCount(BaseModel):
    unread_count: int

class StreamResolution(BaseModel):
    width: int = 640
    height: int = 480

class SystemSettingsBase(BaseModel):
    # Old fields kept for compatibility if needed:
    detection_threshold: float = 0.5
    recording_duration_seconds: int = 30
    auto_delete_days: int = 30
    max_storage_per_user_gb: int = 5
    ai_engine_status: str = "running" # running, stopped
    
    # New Rule Engine fields:
    global_confidence_threshold: float = 0.60
    frame_skip: int = 2
    buffer_size: int = 1
    model_name: str = "yolov8n.pt"
    ai_engine_enabled: bool = True
    stream_resolution: StreamResolution = Field(default_factory=StreamResolution)

class SystemSettingsResponse(SystemSettingsBase):
    id: str = Field(alias="_id")
    updated_at: datetime
    updated_by: Optional[str] = None
    
    class Config:
        populate_by_name = True
        from_attributes = True

class DashboardSummary(BaseModel):
    active_cameras: int
    offline_cameras: int = 0
    total_cameras: int = 0
    total_alerts: int
    alerts_today: int = 0
    critical_alerts: int
    high_alerts: int = 0
    medium_alerts: int = 0
    low_alerts: int = 0
    unread_notifications: int
    storage_used_mb: float
    ai_status: str
    server_time: datetime
    most_detected: List[dict] = []

class SystemHealthResponse(BaseModel):
    ai_engine_status: str
    active_cameras: int
    total_threads: int
    memory_usage_mb: float
    memory_percent: float
    cpu_percent: float
    uptime_seconds: float
    database_status: str
    total_alerts_in_db: int
