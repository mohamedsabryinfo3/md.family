"""School schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from .common import OrmModel


class SchoolCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    address: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None


class SchoolResponse(OrmModel):
    id: str
    family_id: str
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
    added_at: datetime
