"""MD.Family Backend — App policies endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..deps import audit_from_request, get_current_user, require_family_permission
from ...models import AppPolicy, Child, Family, FamilyMembership, User
from ...schemas import AppPolicyCreate, AppPolicyResponse, AppPolicyUpdate, MessageResponse

router = APIRouter(prefix="/families/{family_id}/children/{child_id}/app-policies", tags=["app-policies"])


@router.get("", response_model=list[AppPolicyResponse])
async def list_app_policies(
    family_id: str,
    child_id: str,
    ctx: tuple[Family, FamilyMembership] = Depends(require_family_permission("view_children")),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    family, _ = ctx
    res = await db.execute(
        select(AppPolicy)
        .join(Child, AppPolicy.child_id == Child.id)
        .where(Child.id == child_id, Child.family_id == family.id)
    )
    return [AppPolicyResponse.model_validate(p) for p in res.scalars().all()]


@router.put("", response_model=AppPolicyResponse)
async def upsert_app_policy(
    family_id: str,
    child_id: str,
    payload: AppPolicyCreate,
    request: Request,
    ctx: tuple[Family, FamilyMembership] = Depends(require_family_permission("manage_rules")),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    family, _ = ctx
    child = await db.get(Child, child_id)
    if not child or child.family_id != family.id:
        raise HTTPException(status_code=404, detail="Child not found")

    existing = (
        await db.execute(
            select(AppPolicy).where(
                AppPolicy.child_id == child_id, AppPolicy.package_name == payload.package_name
            )
        )
    ).scalar_one_or_none()
    if existing:
        existing.app_name = payload.app_name
        existing.app_category = payload.app_category
        existing.icon_color = payload.icon_color
        existing.policy = payload.policy
        existing.daily_limit_min = payload.daily_limit_min
        existing.schedule = payload.schedule
        policy = existing
    else:
        policy = AppPolicy(
            child_id=child_id, package_name=payload.package_name, app_name=payload.app_name,
            app_category=payload.app_category, icon_color=payload.icon_color, policy=payload.policy,
            daily_limit_min=payload.daily_limit_min, schedule=payload.schedule,
        )
        db.add(policy)
    await db.flush()
    await audit_from_request(
        request, db, family.id, user.id, "policy.update",
        f"تحديث سياسة تطبيق {payload.app_name} لـ {child.name}: {payload.policy}",
        f"Updated app policy {payload.app_name} for {child.name}: {payload.policy}",
        metadata={"child_id": child_id, "package": payload.package_name, "policy": payload.policy},
    )
    await db.commit()
    await db.refresh(policy)
    return AppPolicyResponse.model_validate(policy)


@router.patch("/{policy_id}", response_model=AppPolicyResponse)
async def patch_app_policy(
    family_id: str,
    child_id: str,
    policy_id: str,
    payload: AppPolicyUpdate,
    request: Request,
    ctx: tuple[Family, FamilyMembership] = Depends(require_family_permission("manage_rules")),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    family, _ = ctx
    policy = await db.get(AppPolicy, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(policy, k, v)
    await audit_from_request(
        request, db, family.id, user.id, "policy.patch",
        f"تعديل سياسة تطبيق: {policy.app_name}",
        f"Patched app policy: {policy.app_name}",
        metadata={"policy_id": policy_id, "fields": list(payload.model_dump(exclude_unset=True).keys())},
    )
    await db.commit()
    await db.refresh(policy)
    return AppPolicyResponse.model_validate(policy)


@router.delete("/{policy_id}", response_model=MessageResponse)
async def delete_app_policy(
    family_id: str,
    child_id: str,
    policy_id: str,
    request: Request,
    ctx: tuple[Family, FamilyMembership] = Depends(require_family_permission("manage_rules")),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    family, _ = ctx
    policy = await db.get(AppPolicy, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    await db.delete(policy)
    await audit_from_request(
        request, db, family.id, user.id, "policy.delete",
        f"حذف سياسة تطبيق: {policy.app_name}",
        f"Deleted app policy: {policy.app_name}",
        metadata={"policy_id": policy_id},
    )
    await db.commit()
    return MessageResponse(message="Policy deleted")


# ─── Extension requests ──────────────────────────────

from ...models import ExtensionRequest
from ...schemas.routine import ExtensionRequestResponse, ExtensionDecision


@router.get(
    "/extensions",
    response_model=list[ExtensionRequestResponse],
    tags=["extension-requests"],
)
async def list_extension_requests(
    family_id: str,
    child_id: str,
    ctx: tuple[Family, FamilyMembership] = Depends(require_family_permission("view_children")),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    family, _ = ctx
    res = await db.execute(
        select(ExtensionRequest)
        .where(ExtensionRequest.child_id == child_id)
        .order_by(ExtensionRequest.requested_at.desc())
    )
    return [ExtensionRequestResponse.model_validate(r) for r in res.scalars().all()]


@router.post(
    "/extensions/{request_id}/decide",
    response_model=ExtensionRequestResponse,
    tags=["extension-requests"],
)
async def decide_extension_request(
    family_id: str,
    child_id: str,
    request_id: str,
    payload: ExtensionDecision,
    request: Request,
    ctx: tuple[Family, FamilyMembership] = Depends(require_family_permission("manage_rules")),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    family, _ = ctx
    er = await db.get(ExtensionRequest, request_id)
    if not er or er.child_id != child_id:
        raise HTTPException(status_code=404, detail="Extension request not found")
    if er.status != "pending":
        raise HTTPException(status_code=400, detail=f"Already decided: {er.status}")
    er.status = payload.decision
    er.decided_by = user.id
    er.decided_at = __import__("datetime").datetime.utcnow()
    await audit_from_request(
        request, db, family.id, user.id, f"extension.{payload.decision}",
        f"{('قبول' if payload.decision == 'approved' else 'رفض')} طلب وقت إضافي لـ {er.app_name}",
        f"{('Approved' if payload.decision == 'approved' else 'Rejected')} extension request for {er.app_name}",
        metadata={"request_id": request_id, "decision": payload.decision},
    )
    await db.commit()
    await db.refresh(er)
    return ExtensionRequestResponse.model_validate(er)
