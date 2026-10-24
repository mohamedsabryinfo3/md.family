"""
MD.Family Backend — application configuration.

All settings are loaded from environment variables with sensible dev defaults.
See `.env.example` for the full list.
"""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import List, Union

from pydantic import AnyHttpUrl, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Centralized configuration. Use `Settings()` or `get_settings()`."""

    model_config = SettingsConfigDict(
        env_prefix="MDFAMILY_",
        env_file=str(Path(__file__).resolve().parents[2] / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ─── App ──────────────────────────────────────────
    app_name: str = "MD.Family Backend"
    app_env: str = "development"
    app_debug: bool = True
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    app_log_level: str = "info"

    @property
    def is_prod(self) -> bool:
        return self.app_env == "production"

    # ─── Database ──────────────────────────────────────
    database_url: str = "sqlite+aiosqlite:///./mdfamily.db"

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")

    @property
    def is_postgres(self) -> bool:
        return self.database_url.startswith("postgres")

    # ─── Redis ────────────────────────────────────────
    redis_url: str = ""  # empty = use in-memory fakeredis

    # ─── Security / JWT ──────────────────────────────
    jwt_secret: str = "change-me-to-a-very-long-random-string-in-production-please"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 43200  # 30 days
    jwt_refresh_token_expire_days: int = 90
    bcrypt_rounds: int = 12

    # ─── Google OAuth ───────────────────────────────
    google_client_id: str = ""
    google_client_secret: str = ""
    google_oauth_redirect_url: str = "http://localhost:8000/api/v1/auth/google/callback"

    # ─── Pairing ──────────────────────────────────────
    pairing_code_ttl_seconds: int = 300
    pairing_code_length: int = 6

    # ─── CORS ────────────────────────────────────────
    cors_origins: Union[List[str], str] = "http://localhost:3000"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_cors(cls, v: object) -> List[str]:
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        if isinstance(v, list):
            return v
        return []

    # ─── Rate limiting ───────────────────────────────
    rate_limit_per_minute: int = 120

    # ─── Backup encryption ────────────────────────────
    backup_encryption_key: str = ""

    # ─── Firebase Cloud Messaging ────────────────────
    # Path to a Firebase service account JSON file (downloaded from Firebase Console).
    # When set, real FCM push notifications are sent to parent/child devices.
    # When empty, the FCM module runs in dev mode (notifications are logged, not sent).
    firebase_service_account_path: str = ""

    # ─── Project paths ────────────────────────────────
    @property
    def project_root(self) -> Path:
        return Path(__file__).resolve().parents[2]


@lru_cache
def get_settings() -> Settings:
    """Cached settings accessor — use this throughout the app."""
    return Settings()


settings = get_settings()
