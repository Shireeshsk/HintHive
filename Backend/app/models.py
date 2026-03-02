from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


# ─── Stored in MongoDB ──────────────────────────────────────
class UserInDB(BaseModel):
    id: Optional[str] = None          # populated from _id after insert
    username: str
    email: EmailStr
    hashed_password: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ─── Request bodies ──────────────────────────────────────────
class SignupRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=30)
    email: EmailStr
    password: str = Field(..., min_length=6)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# ─── Response bodies ─────────────────────────────────────────
class UserResponse(BaseModel):
    id: str
    username: str
    email: EmailStr
    is_active: bool
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class MessageResponse(BaseModel):
    message: str


class UpdateProfileRequest(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=30)
    current_password: Optional[str] = None          # required only when changing password
    new_password: Optional[str] = Field(None, min_length=6)
