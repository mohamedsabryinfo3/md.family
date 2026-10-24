"""Safety alert schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel

from .common import OrmModel


class SafetyAlertResponse(OrmModel):
    id: str
    child_id: str
    severity: str
    category: str
    source: str
    captured_at: datetime
    confidence: str
    reason_ar: str
    reason_en: str
    status: str
    recommendation: str
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None


class AlertReview(BaseModel):
    decision: Literal["ignored", "resolved"]
