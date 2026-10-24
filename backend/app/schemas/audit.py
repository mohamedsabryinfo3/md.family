"""Audit log schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel

from .common import OrmModel


class AuditLogResponse(OrmModel):
    id: str
    family_id: str
    actor_user_id: Optional[str] = None
    action: str
    ar: str
    en: str
    metadata_json: dict[str, Any]
    at: datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
