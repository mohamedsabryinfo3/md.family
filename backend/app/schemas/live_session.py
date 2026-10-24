"""Live session schemas (sensitive features)."""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel

from .common import OrmModel


SessionKind = Literal["screen_view", "voice_call", "ambient_audio"]


class LiveSessionCreate(BaseModel):
    child_id: str
    kind: SessionKind


class LiveSessionResponse(OrmModel):
    id: str
    child_id: str
    kind: str
    status: str
    initiated_by: str
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration_sec: Optional[int] = None
    note: Optional[str] = None
    created_at: datetime

