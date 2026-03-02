from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from datetime import datetime
import re

class UserBase(BaseModel):
    email: EmailStr
    name: str
    alert_email: Optional[EmailStr] = None
    alerts_enabled: bool = True

class UserCreate(UserBase):
    password: str
    role: Optional[str] = "user" # System role
    organization_id: Optional[str] = None
    org_role: Optional[str] = "viewer"

    @validator('role')
    def validate_role(cls, v):
        if v not in ["admin", "user"]:
            raise ValueError('Role must be admin or user')
        return v
    
    @validator('password')
    def validate_password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r"[A-Za-z]", v) or not re.search(r"[0-9]", v):
            raise ValueError('Password must contain both letters and numbers')
        return v

class UserUpdate(BaseModel):
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
    
    class Config:
        populate_by_name = True

class UserResponse(UserBase):
    id: str
    role: str
    organization_id: Optional[str] = None
    org_role: Optional[str] = None
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse
