"""Routine schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

from .common import OrmModel


RoutineKind = Literal["study", "sleep", "downtime"]


class RoutineCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    kind: RoutineKind
    start_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")  # HH:MM
    end_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    days_of_week: list[int] = Field(..., min_length=1)  # [0..6] Sat=0
    exceptions_packages: list[str] = Field(default_factory=list)
    child_id: Optional[str] = None  # None = family-wide
    enabled: bool = True


class RoutineResponse(OrmModel):
    id: str
    family_id: str
    child_id: Optional[str] = None
    name: str
    kind: str
    start_time: str
    end_time: str
    days_of_week: list[int]
    exceptions_packages: list[str]
    enabled: bool
    created_at: datetime
    updated_at: datetime


class ExtensionRequestResponse(OrmModel):
    id: str
    child_id: str
    device_id: Optional[str] = None
    app_name: Optional[str] = None
    requested_minutes: int
    reason: Optional[str] = None
    status: str  # pending | approved | rejected | expired
    decided_by: Optional[str] = None
    decided_at: Optional[datetime] = None
    expires_at: datetime
    requested_at: datetime


class ExtensionDecision(BaseModel):
    decision: Literal["approved", "rejected"]
