"""
MD.Family Backend — FastAPI application entry point.

Run dev:  uvicorn app.main:app --reload --port 8000
Run prod: uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .core.config import settings
from .core.database import Base, engine
from .api.v1 import (
    alerts,
    auth,
    backups,
    children,
    families,
    live_sessions,
    location,
    notifications,
    pairing,
    policies,
    schools_contacts,
    web_filter,
    ws,
)

# ─── Logging ─────────────────────────────────────────

logging.basicConfig(
    level=getattr(logging, settings.app_log_level.upper(), logging.INFO),
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("mdfamily")


# ─── Lifespan ───────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown hook — creates DB tables (dev only).
    In production, use Alembic migrations.
    """
    logger.info("Starting MD.Family Backend (env=%s)", settings.app_env)

    # Create tables (dev convenience — use Alembic in prod)
    if not settings.is_prod:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables ensured (dev mode)")

    yield

    logger.info("Shutting down MD.Family Backend")
    await engine.dispose()


# ─── App ─────────────────────────────────────────────


app = FastAPI(
    title="MD.Family Backend",
    description=(
        "Backend API for MD.Family — the parental control & digital safety app.\n\n"
        "**Architecture**: FastAPI + PostgreSQL + Redis + WebSockets.\n"
        "**Auth**: JWT + Google OAuth.\n"
        "**RBAC**: Primary Owner / Father / Mother (full / custom / no access).\n\n"
        "All sensitive operations are recorded in the audit log."
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)


# ─── CORS ────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Rate limiting middleware (simple) ──────────────


@app.middleware("http")
async def rate_limiter(request: Request, call_next):
    """Simple per-IP rate limit using Redis (or in-memory fallback)."""
    if request.url.path in ("/docs", "/redoc", "/openapi.json", "/health"):
        return await call_next(request)

    from .core.redis_client import rate_limit_increment, is_fake_redis
    client_ip = request.client.host if request.client else "unknown"
    key = f"rate:{client_ip}"
    count = await rate_limit_increment(key, ttl=60)
    if count > settings.rate_limit_per_minute and not is_fake_redis():
        return JSONResponse(
            status_code=429,
            content={"detail": "Rate limit exceeded. Try again in a minute."},
        )
    return await call_next(request)


# ─── Routes ─────────────────────────────────────────

app.include_router(auth.router, prefix="/api/v1")
app.include_router(families.router, prefix="/api/v1")
app.include_router(children.router, prefix="/api/v1")
app.include_router(pairing.router, prefix="/api/v1")
app.include_router(policies.router, prefix="/api/v1")
app.include_router(web_filter.router, prefix="/api/v1")
app.include_router(location.router, prefix="/api/v1")
app.include_router(alerts.router, prefix="/api/v1")
app.include_router(schools_contacts.schools_router, prefix="/api/v1")
app.include_router(schools_contacts.contacts_router, prefix="/api/v1")
app.include_router(schools_contacts.classification_router, prefix="/api/v1")
app.include_router(backups.router, prefix="/api/v1")
app.include_router(live_sessions.router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")
app.include_router(ws.router, prefix="/api/v1")


# ─── Health check ───────────────────────────────────


@app.get("/health", tags=["system"])
async def health():
    """Liveness probe — returns OK if the API is running."""
    return {
        "status": "ok",
        "service": "mdfamily-backend",
        "version": "2.0.0",
        "env": settings.app_env,
        "time": __import__("datetime").datetime.utcnow().isoformat(),
    }


@app.get("/", tags=["system"])
async def root():
    """Root — basic service info + links to docs."""
    return {
        "name": "MD.Family Backend",
        "version": "2.0.0",
        "docs": "/docs",
        "redoc": "/redoc",
        "health": "/health",
    }


# ─── Error handlers ─────────────────────────────────


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content={
            "type": "internal_error",
            "title": "Internal Server Error",
            "status": 500,
            "detail": str(exc) if settings.app_debug else "An unexpected error occurred",
        },
    )
