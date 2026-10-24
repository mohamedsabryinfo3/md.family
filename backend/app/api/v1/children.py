"""
MD.Family Backend — Children endpoints.

POST   /api/v1/families/{fid}/children        — add a child
GET    /api/v1/families/{fid}/children          — list children
GET    /api/v1/families/{fid}/children/{cid}   — get child + devices
PATCH  /api/v1/families/{fid}/children/{cid}   — update child
DELETE /api/v1/families/{fid}/children/{cid}   — soft-delete child
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..deps import audit_from_request, get_current_user, get_user_family, require_family_permission
from ...models import Child, Family, FamilyMembership, User
from ...schemas import ChildCreate, ChildResponse, ChildUpdate, MessageResponse

router = APIRouter(prefix="/families/{family_id}/children", tags=["children"])


@router.post("", response_model=ChildResponse, status_code=status.HTTP_201_CREATED)
async def create_child(
    family_id: str,
    payload: ChildCreate,
    request: Request,
    ctx: tuple[Family, FamilyMembership] = Depends(require_family_permission("manage_rules")),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    family, _ = ctx
    child = Child(
        family_id=family.id,
        name=payload.name,
        avatar_color=payload.avatar_color or "#3182CE",
        avatar_initials=payload.avatar_initials or (payload.name[0] if payload.name else "?"),
        birthdate=payload.birthdate,
        phone_brand=payload.phone_brand,
        school_id=payload.school_id,
    )
    db.add(child)
    await db.flush()
    await audit_from_request(
        request, db, family.id, user.id, "child.create",
        f"إضافة طفل جديد: {child.name}",
        f"Added new child: {child.name}",
        metadata={"child_id": child.id, "name": child.name},
    )
    await db.commit()
    await db.refresh(child)
    return ChildResponse.model_validate(child)


@router.get("", response_model=list[ChildResponse])
async def list_children(
    ctx: tuple[Family, FamilyMembership] = Depends(get_user_family),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    family, _ = ctx
    res = await db.execute(
        select(Child)
        .where(Child.family_id == family.id, Child.is_deleted == False)
        .order_by(Child.created_at)
    )
    return [ChildResponse.model_validate(c) for c in res.scalars().all()]


@router.get("/{child_id}")
async def get_child(
    family_id: str,
    child_id: str,
    ctx: tuple[Family, FamilyMembership] = Depends(get_user_family),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    family, _ = ctx
    res = await db.execute(
        select(Child)
        .options(selectinload(Child.devices), selectinload(Child.school), selectinload(Child.app_policies))
        .where(Child.id == child_id, Child.family_id == family.id, Child.is_deleted == False)
    )
    child = res.scalar_one_or_none()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    return {
        **ChildResponse.model_validate(child).model_dump(),
        "devices": [
            {
                "id": d.id, "label": d.label, "brand": d.brand, "os": d.os,
                "os_version": d.os_version, "app_version": d.app_version,
                "status": d.status, "battery_pct": d.battery_pct,
                "last_seen_at": d.last_seen_at.isoformat() if d.last_seen_at else None,
                "last_sync_at": d.last_sync_at.isoformat() if d.last_sync_at else None,
                "paired_at": d.paired_at.isoformat(),
                "capabilities": d.capabilities,
            }
            for d in child.devices if not d.is_deleted
        ],
        "app_policies": [
            {
                "id": p.id, "package_name": p.package_name, "app_name": p.app_name,
                "app_category": p.app_category, "icon_color": p.icon_color,
                "policy": p.policy, "daily_limit_min": p.daily_limit_min,
                "today_usage_min": p.today_usage_min, "schedule": p.schedule,
            }
            for p in child.app_policies
        ],
        "school": {
            "id": child.school.id, "name": child.school.name,
            "address": child.school.address, "phone": child.school.phone,
        } if child.school else None,
    }


@router.patch("/{child_id}", response_model=ChildResponse)
async def update_child(
    family_id: str,
    child_id: str,
    payload: ChildUpdate,
    request: Request,
    ctx: tuple[Family, FamilyMembership] = Depends(require_family_permission("manage_rules")),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    family, _ = ctx
    child = await db.get(Child, child_id)
    if not child or child.family_id != family.id or child.is_deleted:
        raise HTTPException(status_code=404, detail="Child not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(child, k, v)
    await audit_from_request(
        request, db, family.id, user.id, "child.update",
        f"تعديل ملف الطفل: {child.name}",
        f"Updated child: {child.name}",
        metadata={"child_id": child.id, "fields": list(payload.model_dump(exclude_unset=True).keys())},
    )
    await db.commit()
    await db.refresh(child)
    return ChildResponse.model_validate(child)


@router.delete("/{child_id}", response_model=MessageResponse)
async def delete_child(
    family_id: str,
    child_id: str,
    request: Request,
    ctx: tuple[Family, FamilyMembership] = Depends(require_family_permission("manage_rules")),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    family, _ = ctx
    child = await db.get(Child, child_id)
    if not child or child.family_id != family.id:
        raise HTTPException(status_code=404, detail="Child not found")
    child.is_deleted = True
    await audit_from_request(
        request, db, family.id, user.id, "child.delete",
        f"حذف الطفل: {child.name}",
        f"Deleted child: {child.name}",
        metadata={"child_id": child.id, "name": child.name},
    )
    await db.commit()
    return MessageResponse(message="Child deleted", detail=f"Soft-deleted: {child.name}")
