"""Pairing session schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from .common import OrmModel


class PairingSessionResponse(OrmModel):
    id: str
    family_id: str
    child_id: str
    device_id: Optional[str] = None
    code: str
    status: str  # ready | scanning | verifying | linked | failed | expired
    qr_payload: str
    expires_at: datetime
    failure_reason: Optional[str] = None
    created_at: datetime
