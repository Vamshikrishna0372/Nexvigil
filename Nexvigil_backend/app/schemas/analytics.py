from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime

class AlertAnalyticsResponse(BaseModel):
    total_count: int
    alerts_by_severity: Dict[str, int]
    alerts_by_day: List[Dict[str, Any]] # {date: str, count: int}
    alerts_by_camera: List[Dict[str, Any]] # {camera_id: str, count: int}
    alerts_by_object: List[Dict[str, Any]] = [] # {object: str, count: int}

class RiskScoreResponse(BaseModel):
    risk_score: float
    risk_level: str # Low, Moderate, High, Critical

class AIMetricsBase(BaseModel):
    total_detections: int
    average_confidence: float
    false_positive_estimate: float = 0.0
    processing_fps: float
    model_status: str = "running"
    avg_processing_time_ms: float

class AIMetricsCreate(AIMetricsBase):
    pass

class AIMetricsResponse(AIMetricsBase):
    id: str = Field(alias="_id")
    last_updated: datetime
    
    class Config:
        populate_by_name = True
        from_attributes = True

class CameraHealthResponse(BaseModel):
    online_cameras: int
    offline_cameras: int
    average_uptime_percentage: float

class SystemOverviewResponse(BaseModel):
    total_users: int
    total_cameras: int
    total_alerts: int
    storage_used_total_mb: float
    system_risk_score: float
    ai_engine_status: str

# Helper for typing
from typing import Any
