"""Web filtering schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel

from .common import OrmModel


WebAction = Literal["allow", "alert", "block"]


class WebCategoryUpdate(BaseModel):
    action: WebAction


class WebsiteExceptionCreate(BaseModel):
    url: str
    action: WebAction
    note: Optional[str] = None


class WebsiteExceptionResponse(OrmModel):
    id: str
    family_id: str
    url: str
    action: str
    note: Optional[str] = None
    added_at: datetime


class WebCategoryResponse(OrmModel):
    id: str
    family_id: str
    key: str
    label_ar: str
    label_en: str
    action: str
