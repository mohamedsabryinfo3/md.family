"""
MD.Family Backend — SQLAchemy ORM models.

This module declares all the entities described in the Master Prompt §15
(Users, Families, FamilyMemberships, Roles, PermissionGrants, AuditLogs,
Children, Devices, PairingSessions, AppCatalog, AppPolicies, TimeRules,
WebCategories, WebsiteExceptions, Locations, Geofences, Alerts, ActivityEvents,
Schools, ClassificationReports, Contacts, BackupRecords, LiveSessions).

Design principles:
  - Every table has `id` (UUID string), `created_at`, `updated_at`
  - Foreign keys use UUID strings (so they work on both SQLite & PostgreSQL)
  - JSON columns are used for flexible nested fields (capabilities, etc.)
  - Soft-delete pattern: `is_deleted` flag instead of hard delete where data
    retention matters (audit log never deletes)
  - All timestamps are UTC ISO 8601 strings (stored as DateTime with tz)
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON, TypeDecorator

from ..core.database import Base


# ─── Cross-database JSON type (JSONB on PG, JSON on SQLite) ──


class JSONType(TypeDecorator):
    """JSON type that uses JSONB on PostgreSQL and JSON elsewhere."""
    impl = JSON
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(JSONB())
        return dialect.type_descriptor(JSON())


# ─── Helpers ──────────────────────────────────────────


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> str:
    return str(uuid.uuid4())


# ─── Identity & auth ──────────────────────────────────


class User(Base):
    """A registered account. Can be a parent (father/mother) — children
    don't have direct accounts (their devices pair to a parent's family)."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # None for Google-only
    avatar_color: Mapped[str] = mapped_column(String(20), default="#005C9E", nullable=False)
    avatar_initials: Mapped[str] = mapped_column(String(8), default="?", nullable=False)
    auth_provider: Mapped[str] = mapped_column(String(20), default="email", nullable=False)  # email | google
    google_sub: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, unique=True)
    locale: Mapped[str] = mapped_column(String(10), default="ar", nullable=False)
    theme: Mapped[str] = mapped_column(String(10), default="light", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, onupdate=_now, nullable=False
    )

    family_memberships: Mapped[list["FamilyMembership"]] = relationship(
        "FamilyMembership", back_populates="user", cascade="all, delete-orphan",
        foreign_keys="[FamilyMembership.user_id]",
    )


class Family(Base):
    """A family unit. Owned by exactly one user (the Primary Owner — usually
    the father per the blueprint §4)."""

    __tablename__ = "families"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    owner_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    family_pause_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    safe_search_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    local_vpn_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, onupdate=_now, nullable=False
    )

    members: Mapped[list["FamilyMembership"]] = relationship(
        "FamilyMembership", back_populates="family", cascade="all, delete-orphan"
    )
    children: Mapped[list["Child"]] = relationship(
        "Child", back_populates="family", cascade="all, delete-orphan"
    )
    schools: Mapped[list["School"]] = relationship(
        "School", back_populates="family", cascade="all, delete-orphan"
    )
    contacts: Mapped[list["Contact"]] = relationship(
        "Contact", back_populates="family", cascade="all, delete-orphan"
    )
    web_categories: Mapped[list["WebCategory"]] = relationship(
        "WebCategory", back_populates="family", cascade="all, delete-orphan"
    )
    website_exceptions: Mapped[list["WebsiteException"]] = relationship(
        "WebsiteException", back_populates="family", cascade="all, delete-orphan"
    )
    safe_zones: Mapped[list["SafeZone"]] = relationship(
        "SafeZone", back_populates="family", cascade="all, delete-orphan"
    )
    audit_logs: Mapped[list["AuditLog"]] = relationship(
        "AuditLog", back_populates="family", cascade="all, delete-orphan"
    )
    backups: Mapped[list["BackupRecord"]] = relationship(
        "BackupRecord", back_populates="family", cascade="all, delete-orphan"
    )


class FamilyMembership(Base):
    """A user's membership in a family, with role & access level.

    Roles (per blueprint §4):
      - primary_owner: the family's owning father — full control, cannot be transferred
      - father: same as primary_owner (alias)
      - mother: invited by father, gets custom grants or full access
      - child: not used here (children pair as devices, not users)

    Mother access level:
      - full_access: ordinary management permissions (sensitive features still need explicit grants)
      - custom_access: granular per-permission grants
      - no_access: personal account only, no family data access
    """

    __tablename__ = "family_memberships"
    __table_args__ = (
        UniqueConstraint("family_id", "user_id", name="uq_family_membership"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    family_id: Mapped[str] = mapped_column(String(36), ForeignKey("families.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # primary_owner | father | mother
    mother_access_level: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # full_access | custom_access | no_access
    mother_grants: Mapped[dict[str, Any]] = mapped_column(JSONType, default=dict, nullable=False)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)
    invited_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="family_memberships", foreign_keys=[user_id])
    family: Mapped["Family"] = relationship("Family", back_populates="members")


class PermissionGrant(Base):
    """Catalog of permissions that can be granted to a mother (custom_access)."""

    __tablename__ = "permission_grants"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    key: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    label_ar: Mapped[str] = mapped_column(String(255), nullable=False)
    label_en: Mapped[str] = mapped_column(String(255), nullable=False)
    description_ar: Mapped[str] = mapped_column(Text, nullable=False)
    description_en: Mapped[str] = mapped_column(Text, nullable=False)
    sensitive: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)


# ─── Children & devices ──────────────────────────────


class Child(Base):
    """A child profile within a family.

    NOTE: birthdate is stored but age is NEVER shown next to the name
    (engineering blueprint §5). It's only used internally for age-based policies.
    """

    __tablename__ = "children"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    family_id: Mapped[str] = mapped_column(String(36), ForeignKey("families.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_color: Mapped[str] = mapped_column(String(20), default="#3182CE", nullable=False)
    avatar_initials: Mapped[str] = mapped_column(String(8), default="?", nullable=False)
    birthdate: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)  # ISO date
    phone_brand: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    school_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("schools.id", ondelete="SET NULL"), nullable=True)
    screen_time_today_min: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    screen_time_limit_min: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # 0 = unlimited
    sos_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, onupdate=_now, nullable=False
    )

    family: Mapped["Family"] = relationship("Family", back_populates="children")
    devices: Mapped[list["Device"]] = relationship(
        "Device", back_populates="child", cascade="all, delete-orphan"
    )
    school: Mapped[Optional["School"]] = relationship("School", back_populates="children")
    alerts: Mapped[list["SafetyAlert"]] = relationship(
        "SafetyAlert", back_populates="child", cascade="all, delete-orphan"
    )
    activity_events: Mapped[list["ActivityEvent"]] = relationship(
        "ActivityEvent", back_populates="child", cascade="all, delete-orphan"
    )
    location_samples: Mapped[list["LocationSample"]] = relationship(
        "LocationSample", back_populates="child", cascade="all, delete-orphan"
    )
    app_policies: Mapped[list["AppPolicy"]] = relationship(
        "AppPolicy", back_populates="child", cascade="all, delete-orphan"
    )
    extension_requests: Mapped[list["ExtensionRequest"]] = relationship(
        "ExtensionRequest", back_populates="child", cascade="all, delete-orphan"
    )
    live_sessions: Mapped[list["LiveSession"]] = relationship(
        "LiveSession", back_populates="child", cascade="all, delete-orphan"
    )


class Device(Base):
    """A physical device paired to a child."""

    __tablename__ = "devices"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    child_id: Mapped[str] = mapped_column(String(36), ForeignKey("children.id", ondelete="CASCADE"), nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    brand: Mapped[str] = mapped_column(String(64), nullable=False)
    os: Mapped[str] = mapped_column(String(20), nullable=False)  # Android | iOS
    os_version: Mapped[str] = mapped_column(String(64), nullable=False)
    app_version: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="unknown", nullable=False)  # online|offline|syncing|unknown
    battery_pct: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    last_seen_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_sync_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    paired_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)
    capabilities: Mapped[dict[str, Any]] = mapped_column(JSONType, default=dict, nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, onupdate=_now, nullable=False
    )

    child: Mapped["Child"] = relationship("Child", back_populates="devices")
    pairing_sessions: Mapped[list["PairingSession"]] = relationship(
        "PairingSession", back_populates="device", cascade="all, delete-orphan"
    )


class PairingSession(Base):
    """A one-time QR pairing session between a parent's app and a child's device.

    Lifecycle: ready → scanning → verifying → linked | failed | expired
    The code is single-use, short-lived, and immutable once consumed.
    """

    __tablename__ = "pairing_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    family_id: Mapped[str] = mapped_column(String(36), ForeignKey("families.id", ondelete="CASCADE"), nullable=False)
    child_id: Mapped[str] = mapped_column(String(36), ForeignKey("children.id", ondelete="CASCADE"), nullable=False)
    device_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("devices.id", ondelete="SET NULL"), nullable=True)
    code: Mapped[str] = mapped_column(String(8), nullable=False, unique=True, index=True)
    status: Mapped[str] = mapped_column(String(20), default="ready", nullable=False)
    qr_payload: Mapped[str] = mapped_column(Text, nullable=False)
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failure_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    issued_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    consumed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, onupdate=_now, nullable=False
    )

    device: Mapped[Optional["Device"]] = relationship("Device", back_populates="pairing_sessions")


# ─── App policies & screen time ──────────────────────


class AppPolicy(Base):
    """Per-app policy on a child's device: always_allowed | daily_limit | blocked."""

    __tablename__ = "app_policies"
    __table_args__ = (
        UniqueConstraint("child_id", "package_name", name="uq_child_app"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    child_id: Mapped[str] = mapped_column(String(36), ForeignKey("children.id", ondelete="CASCADE"), nullable=False)
    package_name: Mapped[str] = mapped_column(String(255), nullable=False)
    app_name: Mapped[str] = mapped_column(String(255), nullable=False)
    app_category: Mapped[str] = mapped_column(String(64), nullable=False)
    icon_color: Mapped[str] = mapped_column(String(20), default="#3182CE", nullable=False)
    policy: Mapped[str] = mapped_column(String(20), default="always_allowed", nullable=False)
    daily_limit_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    today_usage_min: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    schedule: Mapped[dict[str, Any]] = mapped_column(JSONType, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, onupdate=_now, nullable=False
    )

    child: Mapped["Child"] = relationship("Child", back_populates="app_policies")


class Routine(Base):
    """A scheduled routine (study/sleep/downtime) for a family or child."""

    __tablename__ = "routines"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    family_id: Mapped[str] = mapped_column(String(36), ForeignKey("families.id", ondelete="CASCADE"), nullable=False)
    child_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("children.id", ondelete="CASCADE"), nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    kind: Mapped[str] = mapped_column(String(20), nullable=False)  # study | sleep | downtime
    start_time: Mapped[str] = mapped_column(String(8), nullable=False)  # HH:MM
    end_time: Mapped[str] = mapped_column(String(8), nullable=False)  # HH:MM
    days_of_week: Mapped[list[int]] = mapped_column(JSONType, default=list, nullable=False)  # [0..6] Sat=0
    exceptions_packages: Mapped[list[str]] = mapped_column(JSONType, default=list, nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, onupdate=_now, nullable=False
    )


class ExtensionRequest(Base):
    """A child's request for more time on an app — approved/rejected by parent."""

    __tablename__ = "extension_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    child_id: Mapped[str] = mapped_column(String(36), ForeignKey("children.id", ondelete="CASCADE"), nullable=False)
    device_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("devices.id", ondelete="SET NULL"), nullable=True)
    app_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    requested_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)  # pending | approved | rejected | expired
    decided_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    decided_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)

    child: Mapped["Child"] = relationship("Child", back_populates="extension_requests")


# ─── Web filtering ────────────────────────────────────


class WebCategory(Base):
    """A web category with an Allow/Alert/Block action — scoped per family."""

    __tablename__ = "web_categories"
    __table_args__ = (
        UniqueConstraint("family_id", "key", name="uq_family_web_cat"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    family_id: Mapped[str] = mapped_column(String(36), ForeignKey("families.id", ondelete="CASCADE"), nullable=False)
    key: Mapped[str] = mapped_column(String(64), nullable=False)
    label_ar: Mapped[str] = mapped_column(String(255), nullable=False)
    label_en: Mapped[str] = mapped_column(String(255), nullable=False)
    action: Mapped[str] = mapped_column(String(10), default="allow", nullable=False)  # allow | alert | block

    family: Mapped["Family"] = relationship("Family", back_populates="web_categories")


class WebsiteException(Base):
    """A per-URL exception (Allow/Alert/Block) overriding the category rule."""

    __tablename__ = "website_exceptions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    family_id: Mapped[str] = mapped_column(String(36), ForeignKey("families.id", ondelete="CASCADE"), nullable=False)
    url: Mapped[str] = mapped_column(String(2048), nullable=False)
    action: Mapped[str] = mapped_column(String(10), nullable=False)  # allow | alert | block
    note: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    added_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)

    family: Mapped["Family"] = relationship("Family", back_populates="website_exceptions")


# ─── Location & geofencing ───────────────────────────


class SafeZone(Base):
    """A geofenced area (home/school/custom) with a radius in meters."""

    __tablename__ = "safe_zones"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    family_id: Mapped[str] = mapped_column(String(36), ForeignKey("families.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    kind: Mapped[str] = mapped_column(String(20), default="custom", nullable=False)  # home | school | custom
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    radius_meters: Mapped[int] = mapped_column(Integer, default=150, nullable=False)
    address: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, onupdate=_now, nullable=False
    )

    family: Mapped["Family"] = relationship("Family", back_populates="safe_zones")


class LocationSample(Base):
    """A single location sample from a child's device."""

    __tablename__ = "location_samples"
    __table_args__ = (Index("ix_loc_child_time", "child_id", "captured_at"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    child_id: Mapped[str] = mapped_column(String(36), ForeignKey("children.id", ondelete="CASCADE"), nullable=False)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    accuracy_meters: Mapped[float] = mapped_column(Float, nullable=False)
    speed_kmh: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    battery_pct: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    source: Mapped[str] = mapped_column(String(20), default="gps", nullable=False)  # gps | network | unknown
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)

    child: Mapped["Child"] = relationship("Child", back_populates="location_samples")


# ─── Safety alerts & activity ────────────────────────


class SafetyAlert(Base):
    """An AI-generated safety alert (advisory only — never auto-punishes)."""

    __tablename__ = "safety_alerts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    child_id: Mapped[str] = mapped_column(String(36), ForeignKey("children.id", ondelete="CASCADE"), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)  # low | medium | high | critical
    category: Mapped[str] = mapped_column(String(64), nullable=False)  # cyberbullying | predator | hate | ...
    source: Mapped[str] = mapped_column(String(255), nullable=False)
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)
    confidence: Mapped[str] = mapped_column(String(10), default="medium", nullable=False)  # low | medium | high
    reason_ar: Mapped[str] = mapped_column(Text, nullable=False)
    reason_en: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)  # pending | reviewing | ignored | resolved
    recommendation: Mapped[str] = mapped_column(String(20), default="review", nullable=False)  # review | ignore | block_source
    reviewed_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)

    child: Mapped["Child"] = relationship("Child", back_populates="alerts")


class ActivityEvent(Base):
    """A unified activity feed item: app_opened, website_blocked, zone_enter, etc."""

    __tablename__ = "activity_events"
    __table_args__ = (Index("ix_activity_child_time", "child_id", "timestamp"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    family_id: Mapped[str] = mapped_column(String(36), ForeignKey("families.id", ondelete="CASCADE"), nullable=False)
    child_id: Mapped[str] = mapped_column(String(36), ForeignKey("children.id", ondelete="CASCADE"), nullable=False)
    type: Mapped[str] = mapped_column(String(40), nullable=False)  # app_opened | app_blocked | website_blocked | zone_enter | zone_exit | sos | ...
    label_ar: Mapped[str] = mapped_column(String(255), nullable=False)
    label_en: Mapped[str] = mapped_column(String(255), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)
    severity: Mapped[str] = mapped_column(String(20), default="info", nullable=False)  # info | warning | critical
    meta: Mapped[dict[str, Any]] = mapped_column(JSONType, default=dict, nullable=False)

    child: Mapped["Child"] = relationship("Child", back_populates="activity_events")


# ─── Schools & contacts ──────────────────────────────


class School(Base):
    """A school record entered by a parent (no fake data in production)."""

    __tablename__ = "schools"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    family_id: Mapped[str] = mapped_column(String(36), ForeignKey("families.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    added_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)

    family: Mapped["Family"] = relationship("Family", back_populates="schools")
    children: Mapped[list["Child"]] = relationship("Child", back_populates="school")


class Contact(Base):
    """A trusted contact (father, mother, grandfather, etc.) for a family."""

    __tablename__ = "contacts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    family_id: Mapped[str] = mapped_column(String(36), ForeignKey("families.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    relation: Mapped[str] = mapped_column(String(20), nullable=False)  # father | mother | grandfather | grandmother | trusted | other
    phone: Mapped[str] = mapped_column(String(64), nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)

    family: Mapped["Family"] = relationship("Family", back_populates="contacts")


class ClassificationReport(Base):
    """A parent-submitted report of incorrect app classification."""

    __tablename__ = "classification_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    family_id: Mapped[str] = mapped_column(String(36), ForeignKey("families.id", ondelete="CASCADE"), nullable=False)
    app_name: Mapped[str] = mapped_column(String(255), nullable=False)
    current_classification: Mapped[str] = mapped_column(String(10), nullable=False)  # safe | adult
    suggested_classification: Mapped[str] = mapped_column(String(10), nullable=False)  # safe | adult
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending_review", nullable=False)  # pending_review | reviewed
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)


# ─── Live sessions (sensitive features) ─────────────


class LiveSession(Base):
    """A Live Screen View / Voice Call / Ambient Audio session.

    These features are SENSITIVE — they require:
      1. Explicit per-session consent from the parent
      2. The corresponding OS-level permission on the child's device
      3. A visible on-device status indicator

    They never start covertly (engineering blueprint §11, §16).
    """

    __tablename__ = "live_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    child_id: Mapped[str] = mapped_column(String(36), ForeignKey("children.id", ondelete="CASCADE"), nullable=False)
    kind: Mapped[str] = mapped_column(String(20), nullable=False)  # screen_view | voice_call | ambient_audio
    status: Mapped[str] = mapped_column(String(20), default="requested", nullable=False)  # requested | active | ended | failed | permission_required | not_supported
    initiated_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_sec: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    note: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)

    child: Mapped["Child"] = relationship("Child", back_populates="live_sessions")


# ─── Backup & audit ──────────────────────────────────


class BackupRecord(Base):
    """A backup record — local / server / cloud. Encrypted at rest."""

    __tablename__ = "backup_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    family_id: Mapped[str] = mapped_column(String(36), ForeignKey("families.id", ondelete="CASCADE"), nullable=False)
    storage: Mapped[str] = mapped_column(String(20), default="local", nullable=False)  # local | server | cloud
    size_kb: Mapped[int] = mapped_column(Integer, nullable=False)
    scope: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="success", nullable=False)  # success | failed | in_progress
    note: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)

    family: Mapped["Family"] = relationship("Family", back_populates="backups")


class AuditLog(Base):
    """Append-only audit log for all sensitive operations (pairing, permission
    changes, policy edits, backups, restores, live sessions). Never deleted."""

    __tablename__ = "audit_logs"
    __table_args__ = (Index("ix_audit_family_time", "family_id", "at"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    family_id: Mapped[str] = mapped_column(String(36), ForeignKey("families.id", ondelete="CASCADE"), nullable=False)
    actor_user_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action: Mapped[str] = mapped_column(String(64), nullable=False)  # pairing.create | permissions.update | ...
    ar: Mapped[str] = mapped_column(Text, nullable=False)
    en: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSONType, default=dict, nullable=False)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)
    ip_address: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    family: Mapped["Family"] = relationship("Family", back_populates="audit_logs")


class DeviceToken(Base):
    """An FCM (Firebase Cloud Messaging) device token registered by a device.

    A single device (child phone or parent phone) registers its FCM token with
    the backend so we can send push notifications to it. Tokens can belong to:
      - a user (parent device)
      - a device (child device)
    The token is updated when Firebase rotates it (rare). The `is_active` flag
    lets us soft-disable a token without losing the audit trail.
    """

    __tablename__ = "device_tokens"
    __table_args__ = (
        UniqueConstraint("token", name="uq_device_tokens_token"),
        Index("ix_device_tokens_user", "user_id"),
        Index("ix_device_tokens_device", "device_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    token: Mapped[str] = mapped_column(String(512), nullable=False)
    # Exactly one of (user_id, device_id) is set:
    user_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    device_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("devices.id", ondelete="CASCADE"), nullable=True)
    platform: Mapped[str] = mapped_column(String(20), default="android", nullable=False)  # android | ios | web
    app_version: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    locale: Mapped[str] = mapped_column(String(10), default="ar", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    registered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, onupdate=_now, nullable=False
    )


__all__ = [
    "Base",
    "User",
    "Family",
    "FamilyMembership",
    "PermissionGrant",
    "Child",
    "Device",
    "PairingSession",
    "AppPolicy",
    "Routine",
    "ExtensionRequest",
    "WebCategory",
    "WebsiteException",
    "SafeZone",
    "LocationSample",
    "SafetyAlert",
    "ActivityEvent",
    "School",
    "Contact",
    "ClassificationReport",
    "LiveSession",
    "BackupRecord",
    "AuditLog",
    "DeviceToken",
]
