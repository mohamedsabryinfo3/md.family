"""Device & pairing schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field

from .common import OrmModel


class DeviceResponse(OrmModel):
    id: str
    child_id: str
    label: str
    brand: str
    os: str
    os_version: str
    app_version: str
    status: str
    battery_pct: Optional[int] = None
    last_seen_at: Optional[datetime] = None
    last_sync_at: Optional[datetime] = None
    paired_at: datetime
    capabilities: dict[str, Any]


class PairingCodeCreate(BaseModel):
    """Request to generate a one-time pairing QR for a child."""
    child_id: str
    label: Optional[str] = Field(None, max_length=255)  # device label (e.g. "هاتف يوسف")


class PairingConsume(BaseModel):
    """Consume a pairing code from the child's device — typically scanned QR."""
    code: str = Field(..., min_length=6, max_length=8)
    device_label: str = Field(..., min_length=1, max_length=255)
    brand: str = Field("Other", max_length=64)
    os: str = Field("Android", pattern="^(Android|iOS)$")
    os_version: str = Field("Android 14")
    app_version: str = Field("MD.Family 2.0.0")
    capabilities: dict[str, bool] = Field(default_factory=dict)
