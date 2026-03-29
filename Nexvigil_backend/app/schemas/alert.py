from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime, timezone

class AlertBase(BaseModel):
    object_detected: str
    confidence: float
    severity: Optional[str] = None          # AI rule engine sets this
    screenshot_path: Optional[str] = None
    video_path: Optional[str] = None
    metadata: Optional[dict] = None
    triggered_rule_id: Optional[str] = None
    rule_name: Optional[str] = None
    display_message: Optional[str] = None
    duration_seconds: Optional[float] = None

class AlertCreate(AlertBase):
    camera_id: str

class AlertResponse(AlertBase):
    id: str = Field(alias="_id")
    severity: Optional[str] = "medium"
    camera_id: Optional[str] = "unknown"
    owner_id: Optional[str] = "system"
    is_acknowledged: bool = False
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        populate_by_name = True
        from_attributes = True

class AlertSummary(BaseModel):
    total_alerts: int
    critical: int
    today: int
    unacknowledged: int

