from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime

class TimeRestriction(BaseModel):
    enabled: bool = False
    start_time: str = "00:00"
    end_time: str = "23:59"

class RuleBase(BaseModel):
    rule_name: str
    is_active: bool = True
    target_classes: List[str] = Field(default_factory=list)
    min_confidence: float = 0.60
    persistence_seconds: int = 2
    cooldown_seconds: int = 10
    severity: str = "medium"
    time_restriction: TimeRestriction = Field(default_factory=TimeRestriction)
    recording_enabled: bool = False
    recording_duration: int = 30
    
    # Advanced / Specific Rules
    zone_coordinates: Optional[List[Dict[str, float]]] = None # [{"x": 10, "y": 20}, ...]
    frequency_threshold: Optional[int] = None # e.g. "if > 5 people context -> Crowd Alert"
    camera_ids: Optional[List[str]] = None # Empty array means applies to all cameras

class RuleCreate(RuleBase):
    pass

class RuleUpdate(BaseModel):
    rule_name: Optional[str] = None
    is_active: Optional[bool] = None
    target_classes: Optional[List[str]] = None
    min_confidence: Optional[float] = None
    persistence_seconds: Optional[int] = None
    cooldown_seconds: Optional[int] = None
    severity: Optional[str] = None
    time_restriction: Optional[TimeRestriction] = None
    recording_enabled: Optional[bool] = None
    recording_duration: Optional[int] = None
    active: Optional[bool] = None # Alias for is_active from UI

class RuleResponse(RuleBase):
    id: str = Field(alias="_id")
    owner_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        from_attributes = True
