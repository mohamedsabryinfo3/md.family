"""Contact schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

from .common import OrmModel


Relation = Literal["father", "mother", "grandfather", "grandmother", "trusted", "other"]


class ContactCreate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    relation: Relation
    phone: str = Field(..., min_length=4, max_length=64)
    is_primary: bool = False
    enabled: bool = True


class ContactResponse(OrmModel):
    id: str
    family_id: str
    name: Optional[str] = None
    relation: str
    phone: str
    is_primary: bool
    enabled: bool
    created_at: datetime
