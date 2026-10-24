"""MD.Family Backend — Web filtering endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..deps import audit_from_request, get_current_user, require_family_permission
from ...models import Family, FamilyMembership, User, WebCategory, WebsiteException
from ...schemas import (
    MessageResponse, WebCategoryResponse, WebCategoryUpdate,
    WebsiteExceptionCreate, WebsiteExceptionResponse,
)

router = APIRouter(prefix="/families/{family_id}/web", tags=["web-filtering"])


DEFAULT_CATEGORIES = [
    ("adult", "محتوى للبالغين", "Adult content", "block"),
    ("gambling", "القمار", "Gambling", "block"),
    ("violence", "العنف", "Violence", "alert"),
    ("shopping", "التسوق", "Shopping", "allow"),
    ("education", "التعليم", "Education", "allow"),
    ("social", "التواصل الاجتماعي", "Social media", "alert"),
    ("games", "الألعاب", "Games", "alert"),
]


async def _ensure_default_categories(family_id: str, db: AsyncSession) -> None:
    """Create the default category set for a new family (idempotent)."""
    res = await db.execute(select(WebCategory).where(WebCategory.family_id == family_id))
    if res.scalars().all():
        return
    for key, ar, en, action in DEFAULT_CATEGORIES:
        db.add(WebCategory(
            family_id=family_id, key=key, label_ar=ar, label_en=en, action=action,
        ))
    await db.flush()


@router.get("/categories", response_model=list[WebCategoryResponse])
async def list_categories(
    family_id: str,
    ctx: tuple[Family, FamilyMembership] = Depends(require_family_permission("view_children")),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    family, _ = ctx
    await _ensure_default_categories(family.id, db)
    res = await db.execute(select(WebCategory).where(WebCategory.family_id == family.id))
    return [WebCategoryResponse.model_validate(c) for c in res.scalars().all()]


@router.put("/categories/{category_id}", response_model=WebCategoryResponse)
async def update_category(
    family_id: str,
    category_id: str,
    payload: WebCategoryUpdate,
    request: Request,
    ctx: tuple[Family, FamilyMembership] = Depends(require_family_permission("manage_rules")),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    family, _ = ctx
    cat = await db.get(WebCategory, category_id)
    if not cat or cat.family_id != family.id:
        raise HTTPException(status_code=404, detail="Category not found")
    cat.action = payload.action
    await audit_from_request(
        request, db, family.id, user.id, "web.category.update",
        f"تعديل فئة ويب {cat.label_ar}: {payload.action}",
        f"Updated web category {cat.label_en}: {payload.action}",
        metadata={"category_id": category_id, "action": payload.action},
    )
    await db.commit()
    await db.refresh(cat)
    return WebCategoryResponse.model_validate(cat)


@router.get("/exceptions", response_model=list[WebsiteExceptionResponse])
async def list_exceptions(
    family_id: str,
    ctx: tuple[Family, FamilyMembership] = Depends(require_family_permission("view_children")),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    family, _ = ctx
    res = await db.execute(
        select(WebsiteException)
        .where(WebsiteException.family_id == family.id)
        .order_by(WebsiteException.added_at.desc())
    )
    return [WebsiteExceptionResponse.model_validate(e) for e in res.scalars().all()]


@router.post("/exceptions", response_model=WebsiteExceptionResponse, status_code=201)
async def add_exception(
    family_id: str,
    payload: WebsiteExceptionCreate,
    request: Request,
    ctx: tuple[Family, FamilyMembership] = Depends(require_family_permission("manage_rules")),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    family, _ = ctx
    ex = WebsiteException(
        family_id=family.id, url=payload.url, action=payload.action, note=payload.note,
    )
    db.add(ex)
    await audit_from_request(
        request, db, family.id, user.id, "web.exception.add",
        f"إضافة استثناء موقع: {payload.url} ({payload.action})",
        f"Added website exception: {payload.url} ({payload.action})",
        metadata={"url": payload.url, "action": payload.action},
    )
    await db.commit()
    await db.refresh(ex)
    return WebsiteExceptionResponse.model_validate(ex)


@router.delete("/exceptions/{exception_id}", response_model=MessageResponse)
async def delete_exception(
    family_id: str,
    exception_id: str,
    request: Request,
    ctx: tuple[Family, FamilyMembership] = Depends(require_family_permission("manage_rules")),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    family, _ = ctx
    ex = await db.get(WebsiteException, exception_id)
    if not ex or ex.family_id != family.id:
        raise HTTPException(status_code=404, detail="Exception not found")
    await db.delete(ex)
    await audit_from_request(
        request, db, family.id, user.id, "web.exception.delete",
        f"حذف استثناء موقع: {ex.url}",
        f"Deleted website exception: {ex.url}",
        metadata={"url": ex.url},
    )
    await db.commit()
    return MessageResponse(message="Exception deleted")
