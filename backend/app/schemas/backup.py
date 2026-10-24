"""Backup schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from .common import OrmModel


class BackupResponse(OrmModel):
    id: str
    family_id: str
    storage: str  # local | server | cloud
    size_kb: int
    scope: str
    status: str
    note: Optional[str] = None
    created_at: datetime
