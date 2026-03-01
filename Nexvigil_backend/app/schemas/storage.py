from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class StorageStats(BaseModel):
    user_id: str
    used_storage_mb: float = 0.0
    total_files: int = 0
    last_updated: datetime

class StorageStatus(BaseModel):
    total_disk_space_mb: float
    used_disk_space_mb: float
    free_disk_space_mb: float
    percentage_used: float

class FileUploadResponse(BaseModel):
    filename: str
    relative_path: str
    file_size_mb: float
    content_type: str
