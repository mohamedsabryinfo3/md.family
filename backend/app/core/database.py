"""
MD.Family Backend — async database engine & session factory.

Uses SQLAlchemy 2.0 async style. The engine is created from `DATABASE_URL`
and works with both SQLite (dev) and PostgreSQL (production).
"""

from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from .config import settings


class Base(DeclarativeBase):
    """Declarative base for all SQLAlchemy models."""

    pass


def _build_engine() -> AsyncEngine:
    """Construct the async engine with appropriate args for the DB driver."""
    url = settings.database_url
    connect_args: dict = {}
    if settings.is_sqlite:
        # SQLite needs `check_same_thread=False` for async usage
        connect_args = {"check_same_thread": False}
    return create_async_engine(
        url,
        echo=settings.app_debug and not settings.is_prod,
        future=True,
        connect_args=connect_args,
        pool_pre_ping=True,  # validate connections on checkout
    )


engine: AsyncEngine = _build_engine()

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency — yields a per-request DB session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


@asynccontextmanager
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Standalone session for use outside FastAPI (scripts, tests, etc.)."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
