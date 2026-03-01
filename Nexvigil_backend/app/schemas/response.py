from typing import Generic, TypeVar, Optional, Any
from pydantic import BaseModel, Field

T = TypeVar("T")

class BaseResponse(BaseModel, Generic[T]):
    success: bool
    message: str
    data: Optional[T] = None

class ErrorResponse(BaseModel):
    success: bool = False
    message: str
    data: Optional[dict] = Field(default_factory=dict)
