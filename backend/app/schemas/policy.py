"""App policy schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

from .common import OrmModel


PolicyMode = Literal["always_allowed", "daily_limit", "blocked"]


class AppPolicyCreate(BaseModel):
    package_name: str = Field(..., min_length=1, max_length=255)
    app_name: str = Field(..., min_length=1, max_length=255)
    app_category: str = Field("tools", max_length=64)
    icon_color: str = "#3182CE"
    policy: PolicyMode = "always_allowed"
    daily_limit_min: Optional[int] = Field(None, ge=0, le=1440)
    schedule: dict[str, Any] = Field(default_factory=dict)


class AppPolicyUpdate(BaseModel):
    policy: Optional[PolicyMode] = None
    daily_limit_min: Optional[int] = Field(None, ge=0, le=1440)
    schedule: Optional[dict[str, Any]] = None


class AppPolicyResponse(OrmModel):
    id: str
    child_id: str
    package_name: str
    app_name: str
    app_category: str
    icon_color: str
    policy: str
    daily_limit_min: Optional[int] = None
    today_usage_min: int
    schedule: dict[str, Any]
    updated_at: datetime
