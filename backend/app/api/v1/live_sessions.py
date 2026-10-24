"""MD.Family Backend — Live sessions (sensitive features) endpoints.

POST   /api/v1/families/{fid}/children/{cid}/live-sessions          — start a session
GET    /api/v1/families/{fid}/children/{cid}/live-sessions          — list sessions
POST   /api/v1/families/{fid}/live-sessions/{sid}/end              — end a session

⚠️ SENSITIVE: requires permission grant + on-device system consent (MediaProjection / Mic).
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..deps import audit_from_request, get_current_user, require_family_permission
from ...models import Child, Device, Family, FamilyMembership, LiveSession, User
from ...schemas import LiveSessionCreate, LiveSessionResponse, MessageResponse

router = APIRouter(prefix="/families/{family_id}", tags=["live-sessions"])

PERMISSION_BY_KIND = {
    "screen_view": "live_screen_view",
    "voice_call": "voice_call",
    "ambient_audio": "ambient_audio",
}


@router.post(
    "/children/{child_id}/live-sessions",
    response_model=LiveSessionResponse,
    status_code=201,
)
async def start_live_session(
    family_id: str,
    child_id: str,
    payload: LiveSessionCreate,
    request: Request,
    ctx: tuple[Family, FamilyMembership] = Depends(
        # The permission check below is dynamic based on payload.kind, but FastAPI
        # dependencies are resolved before the body is parsed. So we accept the
        # dependency as `manage_rules` here and re-check the sensitive permission
        # inside the function body. This ensures RBAC is still enforced.
        require_family_permission("manage_rules"),
    ),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    family, membership = ctx

    # Re-check sensitive permission for this specific session kind
    required_perm = PERMISSION_BY_KIND.get(payload.kind)
    if not required_perm:
        raise HTTPException(status_code=400, detail=f"Unknown session kind: {payload.kind}")

    if membership.role not in ("primary_owner", "father"):
        level = membership.mother_access_level or "no_access"
        grants = membership.mother_grants or {}
        if level == "no_access":
            raise HTTPException(status_code=403, detail="No family access")
        if not grants.get(required_perm, False):
            raise HTTPException(
                status_code=403,
                detail=f"Sensitive permission '{required_perm}' not granted to this account",
            )

    child = await db.get(Child, child_id)
    if not child or child.family_id != family.id:
        raise HTTPException(status_code=404, detail="Child not found")

    # Check device capability
    device = (
        await db.execute(
            select(Device)
            .where(Device.child_id == child_id, Device.is_deleted == False)
            .order_by(Device.last_seen_at.desc().nulls_last())
            .limit(1)
        )
    ).scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="No paired device for this child")

    cap_key = {
        "screen_view": "mediaProjection",
        "voice_call": "microphone",
        "ambient_audio": "microphone",
    }.get(payload.kind)
    if cap_key and not device.capabilities.get(cap_key, False):
        # Don't start the session — return not_supported so the UI can show that
        session = LiveSession(
            child_id=child.id, kind=payload.kind, status="not_supported",
            initiated_by=user.id, note=f"Device lacks {cap_key} capability",
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)
        return LiveSessionResponse.model_validate(session)

    session = LiveSession(
        child_id=child.id, kind=payload.kind, status="requested",
        initiated_by=user.id,
    )
    db.add(session)
    await db.flush()

    # In a real implementation, we'd notify the child device via WebSocket/FCM
    # to prompt for MediaProjection/Mic consent. For v1 we simulate the consent
    # by transitioning to active immediately.
    session.status = "active"
    session.started_at = datetime.utcnow()

    await audit_from_request(
        request, db, family.id, user.id, f"session.{payload.kind}.start",
        f"بدء جلسة {payload.kind} للطفل: {child.name}",
        f"Started {payload.kind} session for {child.name}",
        metadata={"session_id": session.id, "child_id": child.id},
    )
    await db.commit()
    await db.refresh(session)
    return LiveSessionResponse.model_validate(session)


@router.get("/children/{child_id}/live-sessions", response_model=list[LiveSessionResponse])
async def list_live_sessions(
    family_id: str,
    child_id: str,
    ctx: tuple[Family, FamilyMembership] = Depends(require_family_permission("view_children")),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    family, _ = ctx
    res = await db.execute(
        select(LiveSession)
        .join(Child, LiveSession.child_id == Child.id)
        .where(Child.id == child_id, Child.family_id == family.id)
        .order_by(LiveSession.created_at.desc())
        .limit(50)
    )
    return [LiveSessionResponse.model_validate(s) for s in res.scalars().all()]


@router.post("/live-sessions/{session_id}/end", response_model=LiveSessionResponse)
async def end_live_session(
    family_id: str,
    session_id: str,
    request: Request,
    ctx: tuple[Family, FamilyMembership] = Depends(require_family_permission("view_children")),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    family, _ = ctx
    session = await db.get(LiveSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    child = await db.get(Child, session.child_id)
    if not child or child.family_id != family.id:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status == "ended":
        raise HTTPException(status_code=400, detail="Session already ended")

    now = datetime.utcnow()
    session.status = "ended"
    session.ended_at = now
    if session.started_at:
        session.duration_sec = int((now - session.started_at).total_seconds())

    await audit_from_request(
        request, db, family.id, user.id, f"session.{session.kind}.end",
        f"إنهاء جلسة {session.kind} للطفل: {child.name}",
        f"Ended {session.kind} session for {child.name}",
        metadata={"session_id": session_id, "duration_sec": session.duration_sec},
    )
    await db.commit()
    await db.refresh(session)
    return LiveSessionResponse.model_validate(session)
