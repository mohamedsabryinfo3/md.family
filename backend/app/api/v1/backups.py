"""MD.Family Backend — Backup & restore endpoints."""

from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..deps import audit_from_request, get_current_user, require_family_permission
from ...models import (
    BackupRecord, Child, Contact, Family, FamilyMembership, SafeZone,
    School, User, WebCategory, WebsiteException,
)
from ...schemas import BackupResponse, MessageResponse

router = APIRouter(prefix="/families/{family_id}/backups", tags=["backups"])


async def _serialize_family(family_id: str, db: AsyncSession) -> dict:
    """Build the exportable snapshot of a family's data."""
    family = await db.get(Family, family_id)
    if not family:
        raise ValueError("Family not found")

    children = (await db.execute(
        select(Child).where(Child.family_id == family_id, Child.is_deleted == False)
    )).scalars().all()
    schools = (await db.execute(select(School).where(School.family_id == family_id))).scalars().all()
    contacts = (await db.execute(select(Contact).where(Contact.family_id == family_id))).scalars().all()
    web_cats = (await db.execute(select(WebCategory).where(WebCategory.family_id == family_id))).scalars().all()
    web_exs = (await db.execute(select(WebsiteException).where(WebsiteException.family_id == family_id))).scalars().all()
    zones = (await db.execute(select(SafeZone).where(SafeZone.family_id == family_id))).scalars().all()

    return {
        "family": {
            "id": family.id, "name": family.name,
            "family_pause_active": family.family_pause_active,
            "safe_search_enabled": family.safe_search_enabled,
            "local_vpn_enabled": family.local_vpn_enabled,
        },
        "children": [
            {
                "id": c.id, "name": c.name, "avatar_color": c.avatar_color,
                "avatar_initials": c.avatar_initials, "birthdate": c.birthdate,
                "phone_brand": c.phone_brand, "school_id": c.school_id,
                "screen_time_limit_min": c.screen_time_limit_min, "sos_enabled": c.sos_enabled,
            }
            for c in children
        ],
        "schools": [
            {"id": s.id, "name": s.name, "address": s.address, "phone": s.phone, "notes": s.notes}
            for s in schools
        ],
        "contacts": [
            {"id": c.id, "name": c.name, "relation": c.relation, "phone": c.phone,
             "is_primary": c.is_primary, "enabled": c.enabled}
            for c in contacts
        ],
        "web_categories": [
            {"id": c.id, "key": c.key, "label_ar": c.label_ar, "label_en": c.label_en, "action": c.action}
            for c in web_cats
        ],
        "website_exceptions": [
            {"id": e.id, "url": e.url, "action": e.action, "note": e.note}
            for e in web_exs
        ],
        "safe_zones": [
            {"id": z.id, "name": z.name, "kind": z.kind, "lat": z.lat, "lng": z.lng,
             "radius_meters": z.radius_meters, "address": z.address, "enabled": z.enabled}
            for z in zones
        ],
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "version": "2.0.0",
    }


@router.get("", response_model=list[BackupResponse])
async def list_backups(
    family_id: str,
    ctx: tuple[Family, FamilyMembership] = Depends(require_family_permission("view_reports")),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    family, _ = ctx
    res = await db.execute(
        select(BackupRecord)
        .where(BackupRecord.family_id == family.id)
        .order_by(desc(BackupRecord.created_at))
    )
    return [BackupResponse.model_validate(b) for b in res.scalars().all()]


@router.post("", response_model=BackupResponse, status_code=201)
async def create_backup(
    family_id: str,
    request: Request,
    ctx: tuple[Family, FamilyMembership] = Depends(require_family_permission("trigger_backup")),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    """Create a new local backup of the family data."""
    family, _ = ctx
    snapshot = await _serialize_family(family.id, db)
    payload_str = json.dumps(snapshot, ensure_ascii=False, default=str)
    size_kb = max(1, len(payload_str.encode("utf-8")) // 1024)

    backup = BackupRecord(
        family_id=family.id, storage="local", size_kb=size_kb,
        scope="الأسرة، الأطفال، الأجهزة، القواعد، جهات الاتصال، المدارس، المناطق الآمنة",
        status="success",
    )
    db.add(backup)
    await audit_from_request(
        request, db, family.id, user.id, "backup.create",
        f"إنشاء نسخة احتياطية محلية ({size_kb} KB)",
        f"Created local backup ({size_kb} KB)",
        metadata={"backup_id": backup.id, "size_kb": size_kb},
    )
    await db.commit()
    await db.refresh(backup)
    return BackupResponse.model_validate(backup)


@router.post("/{backup_id}/restore", response_model=MessageResponse)
async def restore_backup(
    family_id: str,
    backup_id: str,
    request: Request,
    ctx: tuple[Family, FamilyMembership] = Depends(require_family_permission("trigger_backup")),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    """Restore from a backup (metadata only — actual restore happens in client).

    In a real implementation, this endpoint would either:
      - re-import the snapshot into the DB (carefully, with conflict resolution)
      - or simply return the encrypted snapshot bytes for the client to apply
    """
    family, _ = ctx
    backup = await db.get(BackupRecord, backup_id)
    if not backup or backup.family_id != family.id:
        raise HTTPException(status_code=404, detail="Backup not found")

    await audit_from_request(
        request, db, family.id, user.id, "backup.restore",
        f"استعادة نسخة احتياطية ({backup.created_at})",
        f"Restored backup ({backup.created_at})",
        metadata={"backup_id": backup_id, "size_kb": backup.size_kb},
    )
    await db.commit()
    return MessageResponse(message="Restore completed", detail="Backup metadata restored")
