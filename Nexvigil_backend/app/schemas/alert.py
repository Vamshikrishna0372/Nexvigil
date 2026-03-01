from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime

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

class AlertCreate(AlertBase):
    camera_id: str

class AlertResponse(AlertBase):
    id: str = Field(alias="_id")
    severity: str                            # Always set by alert_service
    camera_id: str
    owner_id: str
    is_acknowledged: bool
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        from_attributes = True

class AlertSummary(BaseModel):
    total_alerts: int
    critical: int
    today: int
    unacknowledged: int

