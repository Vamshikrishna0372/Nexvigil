from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict
from typing import Optional
from datetime import datetime
import re

class UserBase(BaseModel):
    model_config = ConfigDict(extra="allow", from_attributes=True)
    
    email: EmailStr
    name: Optional[str] = "NexVigil User" # MADE OPTIONAL to stop crashes
    alert_email: Optional[EmailStr] = None
    alerts_enabled: Optional[bool] = True

class UserCreate(UserBase):
    password: str
    role: Optional[str] = "user" 
    organization_id: Optional[str] = None
    org_role: Optional[str] = "viewer"

    @field_validator('role')
    @classmethod
    def validate_role(cls, v):
        if v not in ["admin", "user"]:
            return "user" # Fallback instead of raise to prevent 500
        return v
    
    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v

class UserUpdate(BaseModel):
    model_config = ConfigDict(extra="allow")
    name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    org_role: Optional[str] = None
    organization_id: Optional[str] = None
    email: Optional[EmailStr] = None
    alert_email: Optional[EmailStr] = None
    alerts_enabled: Optional[bool] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserInDB(UserBase):
    id: str = Field(alias="_id")
    role: str
    organization_id: Optional[str] = None
    org_role: Optional[str] = None
    status: str
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(
        populate_by_name = True,
        from_attributes = True,
        extra = "allow"
    )

class UserResponse(UserBase):
    id: str
    role: Optional[str] = "user"
    organization_id: Optional[str] = None
    org_role: Optional[str] = None
    
    model_config = ConfigDict(
        from_attributes = True,
        populate_by_name = True,
        extra = "allow" # THE SAVIOR: allow extra fields to stop 500 errors
    )

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse
    
    model_config = ConfigDict(extra="allow")
