"""Child profile schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from .common import OrmModel


class ChildCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    birthdate: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")  # ISO date, optional
    phone_brand: Optional[str] = None
    school_id: Optional[str] = None
    avatar_color: Optional[str] = None
    avatar_initials: Optional[str] = None


class ChildUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    birthdate: Optional[str] = None
    phone_brand: Optional[str] = None
    school_id: Optional[str] = None
    screen_time_limit_min: Optional[int] = Field(None, ge=0, le=1440)
    sos_enabled: Optional[bool] = None


class ChildResponse(OrmModel):
    id: str
    family_id: str
    name: str
    avatar_color: str
    avatar_initials: str
    birthdate: Optional[str] = None
    phone_brand: Optional[str] = None
    school_id: Optional[str] = None
    screen_time_today_min: int
    screen_time_limit_min: int
    sos_enabled: bool
    created_at: datetime
    updated_at: datetime
