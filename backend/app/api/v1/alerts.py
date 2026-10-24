"""MD.Family Backend — Safety alerts endpoints."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..deps import audit_from_request, get_current_user, require_family_permission
from ...models import Child, Family, FamilyMembership, SafetyAlert, User
from ...schemas import AlertReview, MessageResponse, SafetyAlertResponse

router = APIRouter(prefix="/families/{family_id}", tags=["alerts"])


@router.get("/alerts", response_model=list[SafetyAlertResponse])
async def list_alerts(
    family_id: str,
    status_filter: str | None = Query(None, alias="status"),
    child_id: str | None = None,
    ctx: tuple[Family, FamilyMembership] = Depends(require_family_permission("view_children")),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    family, _ = ctx
    q = (
        select(SafetyAlert)
        .join(Child, SafetyAlert.child_id == Child.id)
        .where(Child.family_id == family.id)
    )
    if status_filter:
        q = q.where(SafetyAlert.status == status_filter)
    if child_id:
        q = q.where(SafetyAlert.child_id == child_id)
    q = q.order_by(desc(SafetyAlert.captured_at)).limit(50)
    res = await db.execute(q)
    return [SafetyAlertResponse.model_validate(a) for a in res.scalars().all()]


@router.post("/alerts/{alert_id}/review", response_model=SafetyAlertResponse)
async def review_alert(
    family_id: str,
    alert_id: str,
    payload: AlertReview,
    request: Request,
    ctx: tuple[Family, FamilyMembership] = Depends(require_family_permission("view_children")),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    family, _ = ctx
    alert = await db.get(SafetyAlert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    # Verify alert belongs to this family
    child = await db.get(Child, alert.child_id)
    if not child or child.family_id != family.id:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.status = payload.decision  # ignored | resolved
    alert.reviewed_by = user.id
    alert.reviewed_at = datetime.utcnow()
    await audit_from_request(
        request, db, family.id, user.id, f"alert.{payload.decision}",
        f"مراجعة تنبيه ({payload.decision}) للطفل {child.name}",
        f"Reviewed alert ({payload.decision}) for {child.name}",
        metadata={"alert_id": alert_id, "decision": payload.decision},
    )
    await db.commit()
    await db.refresh(alert)
    return SafetyAlertResponse.model_validate(alert)


@router.get("/activity")
async def list_activity(
    family_id: str,
    child_id: str | None = None,
    limit: int = Query(20, ge=1, le=200),
    ctx: tuple[Family, FamilyMembership] = Depends(require_family_permission("view_children")),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    family, _ = ctx
    from ...models import ActivityEvent
    q = select(ActivityEvent).where(ActivityEvent.family_id == family.id)
    if child_id:
        q = q.where(ActivityEvent.child_id == child_id)
    q = q.order_by(desc(ActivityEvent.timestamp)).limit(limit)
    res = await db.execute(q)
    return [
        {
            "id": e.id, "child_id": e.child_id, "type": e.type,
            "label_ar": e.label_ar, "label_en": e.label_en,
            "timestamp": e.timestamp.isoformat(), "severity": e.severity,
            "meta": e.meta,
        }
        for e in res.scalars().all()
    ]
