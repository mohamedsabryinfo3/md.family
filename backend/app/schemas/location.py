"""Location & geofence schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

from .common import OrmModel


class LocationSampleCreate(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    accuracy_meters: float = Field(..., ge=0)
    speed_kmh: Optional[float] = Field(None, ge=0, le=400)
    battery_pct: Optional[int] = Field(None, ge=0, le=100)
    source: Literal["gps", "network", "unknown"] = "gps"
    captured_at: Optional[datetime] = None


class LocationSampleResponse(OrmModel):
    id: str
    child_id: str
    lat: float
    lng: float
    accuracy_meters: float
    speed_kmh: Optional[float] = None
    battery_pct: Optional[int] = None
    source: str
    captured_at: datetime


class SafeZoneCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    kind: Literal["home", "school", "custom"] = "custom"
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    radius_meters: int = Field(150, ge=10, le=10000)
    address: Optional[str] = None
    enabled: bool = True


class SafeZoneResponse(OrmModel):
    id: str
    family_id: str
    name: str
    kind: str
    lat: float
    lng: float
    radius_meters: int
    address: Optional[str] = None
    enabled: bool
    created_at: datetime
