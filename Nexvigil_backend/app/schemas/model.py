from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class ModelMetrics(BaseModel):
    map50: Optional[float] = None
    precision: Optional[float] = None
    recall: Optional[float] = None
    f1: Optional[float] = None
    training_time_seconds: Optional[float] = None

class ModelBase(BaseModel):
    model_name: str
    version: str
    file_path: str
    description: Optional[str] = None
    model_type: str = "yolov8" # yolov8, custom, etc.

class ModelCreate(ModelBase):
    metrics: Optional[ModelMetrics] = None

class ModelResponse(ModelBase):
    id: str = Field(alias="_id")
    status: str # active, inactive
    metrics: Optional[ModelMetrics] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        from_attributes = True

class ActiveModelResponse(BaseModel):
    model_name: str
    version: str
    file_path: str
    config_hash: Optional[str] = None
