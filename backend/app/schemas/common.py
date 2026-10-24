"""Common Pydantic schemas shared across endpoints."""

from __future__ import annotations

from typing import Any, Generic, Optional, TypeVar

from pydantic import BaseModel, ConfigDict


class MessageResponse(BaseModel):
    """Generic OK/error message envelope."""
    message: str
    detail: Optional[str] = None


class ErrorResponse(BaseModel):
    """Standard error envelope (RFC 7807-inspired)."""
    type: str = "about:blank"
    title: str
    status: int
    detail: Optional[str] = None
    instance: Optional[str] = None


T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated list envelope."""
    items: list[T]
    total: int
    page: int = 1
    page_size: int = 20
    has_next: bool = False


class OrmModel(BaseModel):
    """Base model with from_attributes enabled (for SQLAlchemy ORM models)."""
    model_config = ConfigDict(from_attributes=True)
