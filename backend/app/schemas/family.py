"""Family & permissions schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

from .common import OrmModel


MotherAccessLevel = Literal["full_access", "custom_access", "no_access"]


class FamilyCreate(BaseModel):
    """Create a new family (the creator becomes Primary Owner)."""
    name: str = Field(..., min_length=2, max_length=255)


class FamilyResponse(OrmModel):
    id: str
    name: str
    owner_id: str
    family_pause_active: bool
    safe_search_enabled: bool
    local_vpn_enabled: bool
    created_at: datetime


class MotherPermissionsUpdate(BaseModel):
    """Update mother's access level + per-permission grants."""
    access_level: MotherAccessLevel
    grants: Optional[dict[str, bool]] = None  # keyed by PermissionGrant.key
