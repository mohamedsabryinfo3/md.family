"""MD.Family Backend — Schools, Contacts, Classification reports endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..deps import audit_from_request, get_current_user, require_family_permission
from ...models import (
    Child, ClassificationReport, Contact, Family, FamilyMembership, School, User,
)
from ...schemas import (
    ContactCreate, ContactResponse, MessageResponse, SchoolCreate, SchoolResponse,
)

# ─── Schools ─────────────────────────────────────────

schools_router = APIRouter(prefix="/families/{family_id}/schools", tags=["schools"])


@schools_router.get("", response_model=list[SchoolResponse])
async def list_schools(
    family_id: str,
    ctx: tuple[Family, FamilyMembership] = Depends(require_family_permission("view_children")),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    family, _ = ctx
    res = await db.execute(select(School).where(School.family_id == family.id))
    return [SchoolResponse.model_validate(s) for s in res.scalars().all()]


@schools_router.post("", response_model=SchoolResponse, status_code=201)
async def create_school(
    family_id: str,
    payload: SchoolCreate,
    request: Request,
    ctx: tuple[Family, FamilyMembership] = Depends(require_family_permission("manage_schools")),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    family, _ = ctx
    school = School(
        family_id=family.id, name=payload.name, address=payload.address,
        phone=payload.phone, notes=payload.notes,
    )
    db.add(school)
    await audit_from_request(
        request, db, family.id, user.id, "school.create",
        f"إضافة مدرسة: {payload.name}",
        f"Added school: {payload.name}",
        metadata={"school_id": school.id, "name": payload.name},
    )
    await db.commit()
    await db.refresh(school)
    return SchoolResponse.model_validate(school)


@schools_router.delete("/{school_id}", response_model=MessageResponse)
async def delete_school(
    family_id: str,
    school_id: str,
    request: Request,
    ctx: tuple[Family, FamilyMembership] = Depends(require_family_permission("manage_schools")),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    family, _ = ctx
    school = await db.get(School, school_id)
    if not school or school.family_id != family.id:
        raise HTTPException(status_code=404, detail="School not found")
    await db.delete(school)
    await audit_from_request(
        request, db, family.id, user.id, "school.delete",
        f"حذف مدرسة: {school.name}",
        f"Deleted school: {school.name}",
        metadata={"school_id": school_id},
    )
    await db.commit()
    return MessageResponse(message="School deleted")


# ─── Contacts ────────────────────────────────────────

contacts_router = APIRouter(prefix="/families/{family_id}/contacts", tags=["contacts"])


@contacts_router.get("", response_model=list[ContactResponse])
async def list_contacts(
    family_id: str,
    ctx: tuple[Family, FamilyMembership] = Depends(require_family_permission("view_children")),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    family, _ = ctx
    res = await db.execute(select(Contact).where(Contact.family_id == family.id))
    return [ContactResponse.model_validate(c) for c in res.scalars().all()]


@contacts_router.post("", response_model=ContactResponse, status_code=201)
async def add_contact(
    family_id: str,
    payload: ContactCreate,
    request: Request,
    ctx: tuple[Family, FamilyMembership] = Depends(require_family_permission("manage_contacts")),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    family, _ = ctx
    contact = Contact(
        family_id=family.id, name=payload.name, relation=payload.relation,
        phone=payload.phone, is_primary=payload.is_primary, enabled=payload.enabled,
    )
    db.add(contact)
    await audit_from_request(
        request, db, family.id, user.id, "contact.add",
        f"إضافة جهة اتصال: {payload.name or payload.phone}",
        f"Added contact: {payload.name or payload.phone}",
        metadata={"contact_id": contact.id, "phone": payload.phone},
    )
    await db.commit()
    await db.refresh(contact)
    return ContactResponse.model_validate(contact)


@contacts_router.delete("/{contact_id}", response_model=MessageResponse)
async def delete_contact(
    family_id: str,
    contact_id: str,
    request: Request,
    ctx: tuple[Family, FamilyMembership] = Depends(require_family_permission("manage_contacts")),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    family, _ = ctx
    contact = await db.get(Contact, contact_id)
    if not contact or contact.family_id != family.id:
        raise HTTPException(status_code=404, detail="Contact not found")
    await db.delete(contact)
    await audit_from_request(
        request, db, family.id, user.id, "contact.delete",
        f"حذف جهة اتصال: {contact.name or contact.phone}",
        f"Deleted contact: {contact.name or contact.phone}",
        metadata={"contact_id": contact_id},
    )
    await db.commit()
    return MessageResponse(message="Contact deleted")


# ─── Classification reports ──────────────────────────

classification_router = APIRouter(
    prefix="/families/{family_id}/classification-reports",
    tags=["classification"],
)


@classification_router.post("", status_code=201)
async def submit_classification_report(
    family_id: str,
    payload: dict,
    request: Request,
    ctx: tuple[Family, FamilyMembership] = Depends(require_family_permission("view_children")),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    family, _ = ctx
    report = ClassificationReport(
        family_id=family.id,
        app_name=payload.get("app_name", ""),
        current_classification=payload.get("current_classification", "safe"),
        suggested_classification=payload.get("suggested_classification", "safe"),
        reason=payload.get("reason", ""),
        note=payload.get("note"),
        status="pending_review",
    )
    db.add(report)
    await audit_from_request(
        request, db, family.id, user.id, "classification.report",
        f"بلاغ تصنيف خاطئ للتطبيق: {report.app_name}",
        f"Submitted classification report for: {report.app_name}",
        metadata={"report_id": report.id, "app_name": report.app_name},
    )
    await db.commit()
    return {"id": report.id, "status": report.status, "message": "Report submitted"}
