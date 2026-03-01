from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

class AnomalyEvent(BaseModel):
    camera_id: str
    organization_id: Optional[str] = None
    anomaly_type: str # spike, deviation, policy_violation
    anomaly_score: float # 0-100
    details: str
    severity: str # moderate, high, critical
    created_at: datetime

class AnomalySummary(BaseModel):
    total_anomalies: int
    critical_anomalies: int
    recent_events: List[AnomalyEvent]
