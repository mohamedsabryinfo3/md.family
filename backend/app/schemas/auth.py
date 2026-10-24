"""Authentication & user schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from .common import OrmModel


class UserCreate(BaseModel):
    """Registration request — email + password."""
    email: EmailStr
    name: str = Field(..., min_length=2, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    locale: str = Field("ar", pattern="^(ar|en)$")


class UserLogin(BaseModel):
    """Login request — email + password."""
    email: EmailStr
    password: str = Field(..., min_length=1)


class GoogleLoginRequest(BaseModel):
    """Login via Google — send the ID token received from Google Sign-In SDK."""
    id_token: str = Field(..., min_length=10)


class RefreshRequest(BaseModel):
    """Exchange a refresh token for a new access token."""
    refresh_token: str


class UserResponse(OrmModel):
    """Public user representation."""
    id: str
    email: EmailStr
    name: str
    avatar_color: str
    avatar_initials: str
    auth_provider: str
    locale: str
    theme: str
    is_active: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime


class TokenResponse(BaseModel):
    """JWT access + refresh tokens + user info."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    user: UserResponse
