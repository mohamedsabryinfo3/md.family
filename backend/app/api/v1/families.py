"""
MD.Family Backend — Family & membership endpoints.

POST   /api/v1/families                       — create a new family
GET    /api/v1/families/{id}                    — get family details
PUT    /api/v1/families/{id}                    — update family settings (pause, safe search, vpn)
GET    /api/v1/families/{id}/audit              — list audit log entries
PUT    /api/v1/families/{id}/members/{memberId}/permissions — update mother permissions
GET    /api/v1/families/{id}/dashboard          — dashboard summary (children + alerts + activity)
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..deps import audit_from_request, get_current_user, get_user_family, require_family_permission
from ...models import (
    ActivityEvent, AuditLog, Child, Family, FamilyMembership, PermissionGrant,
    SafetyAlert, User,
)
from ...schemas import (
    AuditLogResponse, FamilyCreate, FamilyResponse, MotherPermissionsUpdate,
    MessageResponse, PaginatedResponse,
)

router = APIRouter(prefix="/families", tags=["families"])

PERMISSION_GRANTS_SEED = [
    {"key": "view_children", "label_ar": "عرض ملفات الأطفال", "label_en": "View child profiles",
     "description_ar": "الاطلاع على بيانات الأطفال دون تعديل.", "description_en": "Read child data without editing.",
     "sensitive": False},
    {"key": "view_devices", "label_ar": "عرض الأجهزة", "label_en": "View devices",
     "description_ar": "رؤية حالة الأجهزة وآخر مزامنة.", "description_en": "See device status and last sync.",
     "sensitive": False},
    {"key": "view_reports", "label_ar": "عرض التقارير", "label_en": "View reports",
     "description_ar": "تقارير وقت الشاشة والاستخدام.", "description_en": "Screen time and usage reports.",
     "sensitive": False},
    {"key": "manage_rules", "label_ar": "تعديل القواعد", "label_en": "Edit rules",
     "description_ar": "تعديل حدود الوقت والروتينات والاستثناءات.", "description_en": "Edit time limits, routines, exceptions.",
     "sensitive": False},
    {"key": "manage_contacts", "label_ar": "إدارة جهات الاتصال", "label_en": "Manage contacts",
     "description_ar": "إضافة وتعديل أرقام العائلة.", "description_en": "Add and edit family numbers.",
     "sensitive": False},
    {"key": "manage_schools", "label_ar": "إدارة المدارس", "label_en": "Manage schools",
     "description_ar": "إضافة وتعديل بيانات المدارس.", "description_en": "Add and edit schools.",
     "sensitive": False},
    {"key": "trigger_backup", "label_ar": "إنشاء نسخة احتياطية", "label_en": "Create backup",
     "description_ar": "إنشاء نسخ احتياطية محلية.", "description_en": "Create local backups.",
     "sensitive": False},
    {"key": "live_screen_view", "label_ar": "مشاهدة الشاشة الحية", "label_en": "Live Screen View",
     "description_ar": "صلاحية مستقلة وحساسة — تتطلب موافقة نظام وحالة ظاهرة على الجهاز.",
     "description_en": "Independent, sensitive permission — requires system consent and visible on-device status.",
     "sensitive": True},
    {"key": "ambient_audio", "label_ar": "جلسة صوت المحيط", "label_en": "Ambient audio session",
     "description_ar": "صلاحية مستقلة وحساسة — لا تعمل خفية ولا تتجاوز مؤشرات الخصوصية.",
     "description_en": "Independent, sensitive — never covert, never bypasses privacy indicators.",
     "sensitive": True},
    {"key": "voice_call", "label_ar": "مكالمة صوتية", "label_en": "Voice call",
     "description_ar": "اتصال صوتي ثنائي الاتجاه — يتطلب إذن الميكروفون.",
     "description_en": "Two-way voice call — requires microphone permission.",
     "sensitive": True},
]


async def _ensure_permission_grants(db: AsyncSession) -> None:
    """Seed the permission_grants catalog if empty."""
    res = await db.execute(select(PermissionGrant).limit(1))
    if res.scalar_one_or_none() is None:
        for grant in PERMISSION_GRANTS_SEED:
            db.add(PermissionGrant(**grant))
        await db.flush()


@router.post("", response_model=FamilyResponse, status_code=status.HTTP_201_CREATED)
async def create_family(
    payload: FamilyCreate,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    """Create a new family — the creator becomes Primary Owner."""
    family = Family(name=payload.name, owner_id=user.id)
    db.add(family)
    await db.flush()

    membership = FamilyMembership(
        family_id=family.id,
        user_id=user.id,
        role="primary_owner",
        mother_access_level=None,
        mother_grants={},
    )
    db.add(membership)
    await db.flush()

    await _ensure_permission_grants(db)

    await audit_from_request(
        request, db, family.id, user.id, "family.create",
        f"إنشاء أسرة جديدة: {payload.name}",
        f"Created new family: {payload.name}",
        metadata={"name": payload.name},
    )
    await db.commit()
    await db.refresh(family)
    return FamilyResponse.model_validate(family)


@router.get("/{family_id}", response_model=FamilyResponse)
async def get_family(
    family_id: str,
    ctx: tuple[Family, FamilyMembership] = Depends(get_user_family),
):
    family, _ = ctx
    return FamilyResponse.model_validate(family)


@router.put("/{family_id}", response_model=FamilyResponse)
async def update_family(
    family_id: str,
    payload: dict[str, Any],
    request: Request,
    ctx: tuple[Family, FamilyMembership] = Depends(require_family_permission("manage_rules")),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    """Update family-wide settings: family_pause_active, safe_search_enabled, local_vpn_enabled."""
    family, _ = ctx
    changes = []
    for key in ("family_pause_active", "safe_search_enabled", "local_vpn_enabled"):
        if key in payload and isinstance(payload[key], bool):
            old = getattr(family, key)
            setattr(family, key, payload[key])
            if old != payload[key]:
                changes.append(f"{key}: {old} -> {payload[key]}")
    if changes:
        await audit_from_request(
            request, db, family.id, user.id, "family.update",
            "تعديل إعدادات الأسرة: " + "، ".join(changes),
            "Updated family settings: " + ", ".join(changes),
            metadata={"changes": changes},
        )
    await db.commit()
    await db.refresh(family)
    return FamilyResponse.model_validate(family)


@router.get("/{family_id}/audit", response_model=PaginatedResponse[AuditLogResponse])
async def list_audit_log(
    family_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    ctx: tuple[Family, FamilyMembership] = Depends(require_family_permission("view_reports")),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    """List audit log entries (paginated, newest first)."""
    family, _ = ctx
    offset = (page - 1) * page_size
    q = (
        select(AuditLog)
        .where(AuditLog.family_id == family_id)
        .order_by(desc(AuditLog.at))
        .offset(offset)
        .limit(page_size)
    )
    res = await db.execute(q)
    items = [AuditLogResponse.model_validate(r) for r in res.scalars().all()]

    count_q = select(AuditLog).where(AuditLog.family_id == family_id)
    total = (await db.execute(count_q)).all().__len__()
    return PaginatedResponse(
        items=items, total=total, page=page, page_size=page_size,
        has_next=offset + len(items) < total,
    )


@router.put(
    "/{family_id}/members/{member_id}/permissions",
    response_model=MessageResponse,
)
async def update_member_permissions(
    family_id: str,
    member_id: str,
    payload: MotherPermissionsUpdate,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    """Update a member's access level + grants. Only the Primary Owner can do this.

    NOTE: a member can NEVER escalate their own permissions or transfer ownership.
    """
    family, membership = await get_user_family(family_id, user, db)
    if membership.role not in ("primary_owner", "father"):
        raise HTTPException(
            status_code=403,
            detail="Only the Primary Owner (father) can update member permissions",
        )

    target_membership = await db.get(FamilyMembership, member_id)
    if not target_membership or target_membership.family_id != family_id:
        raise HTTPException(status_code=404, detail="Membership not found")

    if target_membership.role in ("primary_owner", "father"):
        raise HTTPException(
            status_code=403,
            detail="Cannot modify permissions of the Primary Owner",
        )

    # Prevent self-escalation: a user can never grant themselves higher perms
    if target_membership.user_id == user.id:
        raise HTTPException(
            status_code=403,
            detail="You cannot modify your own permissions (no self-escalation)",
        )

    target_membership.mother_access_level = payload.access_level
    if payload.access_level == "full_access":
        # Grant all non-sensitive permissions
        all_grants = (await db.execute(select(PermissionGrant))).scalars().all()
        target_membership.mother_grants = {
            g.key: (not g.sensitive) for g in all_grants
        }
    elif payload.access_level == "no_access":
        target_membership.mother_grants = {}
    elif payload.grants:
        target_membership.mother_grants = payload.grants

    await audit_from_request(
        request, db, family_id, user.id, "permissions.update",
        f"تعديل صلاحيات العضو {member_id}: مستوى={payload.access_level}",
        f"Updated member {member_id} permissions: level={payload.access_level}",
        metadata={"member_id": member_id, "level": payload.access_level, "grants": target_membership.mother_grants},
    )
    await db.commit()
    return MessageResponse(message="Permissions updated", detail=str(payload.access_level))


@router.get("/{family_id}/dashboard")
async def get_dashboard(
    family_id: str,
    ctx: tuple[Family, FamilyMembership] = Depends(get_user_family),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    """Get a complete dashboard summary: children + their devices + recent alerts + activity."""
    family, _ = ctx
    # Load children with their devices and recent alerts
    children_q = (
        select(Child)
        .where(Child.family_id == family_id, Child.is_deleted == False)
        .options(selectinload(Child.devices), selectinload(Child.school))
    )
    children = (await db.execute(children_q)).scalars().all()

    alerts_q = (
        select(SafetyAlert)
        .join(Child, SafetyAlert.child_id == Child.id)
        .where(Child.family_id == family_id)
        .order_by(desc(SafetyAlert.captured_at))
        .limit(10)
    )
    alerts = (await db.execute(alerts_q)).scalars().all()

    activity_q = (
        select(ActivityEvent)
        .where(ActivityEvent.family_id == family_id)
        .order_by(desc(ActivityEvent.timestamp))
        .limit(10)
    )
    activity = (await db.execute(activity_q)).scalars().all()

    return {
        "family": FamilyResponse.model_validate(family),
        "children": [
            {
                "id": c.id,
                "name": c.name,
                "avatar_color": c.avatar_color,
                "avatar_initials": c.avatar_initials,
                "phone_brand": c.phone_brand,
                "screen_time_today_min": c.screen_time_today_min,
                "screen_time_limit_min": c.screen_time_limit_min,
                "today_usage_pct": (
                    min(100, int((c.screen_time_today_min / c.screen_time_limit_min) * 100))
                    if c.screen_time_limit_min > 0 else 0
                ),
                "devices": [
                    {
                        "id": d.id, "label": d.label, "brand": d.brand,
                        "status": d.status, "battery_pct": d.battery_pct,
                        "last_seen_at": d.last_seen_at.isoformat() if d.last_seen_at else None,
                        "last_sync_at": d.last_sync_at.isoformat() if d.last_sync_at else None,
                    }
                    for d in c.devices if not d.is_deleted
                ],
            }
            for c in children
        ],
        "alerts": [
            {
                "id": a.id, "child_id": a.child_id, "severity": a.severity,
                "category": a.category, "source": a.source,
                "captured_at": a.captured_at.isoformat(),
                "confidence": a.confidence, "status": a.status,
                "reason_ar": a.reason_ar, "reason_en": a.reason_en,
            }
            for a in alerts
        ],
        "activity": [
            {
                "id": e.id, "child_id": e.child_id, "type": e.type,
                "label_ar": e.label_ar, "label_en": e.label_en,
                "timestamp": e.timestamp.isoformat(), "severity": e.severity,
            }
            for e in activity
        ],
    }


@router.get("/permissions/grants")
async def list_permission_grants(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    """List all permission grant definitions (catalog)."""
    await _ensure_permission_grants(db)
    res = await db.execute(select(PermissionGrant).order_by(PermissionGrant.sensitive, PermissionGrant.key))
    return [
        {
            "key": g.key, "label_ar": g.label_ar, "label_en": g.label_en,
            "description_ar": g.description_ar, "description_en": g.description_en,
            "sensitive": g.sensitive,
        }
        for g in res.scalars().all()
    ]
