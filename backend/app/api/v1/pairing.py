"""
MD.Family Backend — Pairing endpoints (the QR code flow).

POST   /api/v1/families/{fid}/children/{cid}/pairing       — create a one-time QR
GET    /api/v1/families/{fid}/pairing/{session_id}          — check status
POST   /api/v1/families/{fid}/pairing/{session_id}/cancel  — cancel session
POST   /api/v1/families/{fid}/pairing/{session_id}/regenerate — regenerate code (extends TTL)
POST   /api/v1/pairing/consume                              — public endpoint consumed by the child device
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.config import settings
from ...core.security import build_pairing_payload, generate_pairing_code
from ..deps import audit_from_request, get_current_user, require_family_permission
from ...models import Child, Device, Family, FamilyMembership, PairingSession, User
from ...schemas import (
    DeviceResponse, MessageResponse, PairingCodeCreate, PairingConsume, PairingSessionResponse,
)

router = APIRouter(prefix="/pairing", tags=["pairing"])


# ─── Parent-side: create / inspect / cancel ──────────


@router.post(
    "/families/{family_id}/children/{child_id}/pairing",
    response_model=PairingSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_pairing_session(
    family_id: str,
    child_id: str,
    payload: PairingCodeCreate,
    request: Request,
    ctx: tuple[Family, FamilyMembership] = Depends(require_family_permission("manage_rules")),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    """Generate a one-time QR + 6-digit code for pairing a child's device.

    The code is:
      - Single-use (consumed after success)
      - Short-lived (5 minutes default)
      - Random (cryptographically secure)
      - Linked to a specific family + child + (optional) device label
    """
    family, _ = ctx
    if payload.child_id != child_id:
        raise HTTPException(status_code=400, detail="child_id mismatch between URL and body")
    child = await db.get(Child, child_id)
    if not child or child.family_id != family.id or child.is_deleted:
        raise HTTPException(status_code=404, detail="Child not found")

    # Ensure code is unique
    for _ in range(5):
        code = generate_pairing_code()
        exists = (
            await db.execute(select(PairingSession).where(PairingSession.code == code))
        ).scalar_one_or_none()
        if not exists:
            break
    else:
        raise HTTPException(status_code=500, detail="Could not generate unique pairing code")

    now = datetime.utcnow()
    expires_at = now + timedelta(seconds=settings.pairing_code_ttl_seconds)
    qr_payload = build_pairing_payload("pending", code, family.id, child.id)

    session = PairingSession(
        family_id=family.id,
        child_id=child.id,
        device_id=None,
        code=code,
        status="ready",
        qr_payload=qr_payload,
        expires_at=expires_at,
        issued_by=user.id,
    )
    db.add(session)
    await db.flush()
    # Update qr_payload with real session id
    session.qr_payload = build_pairing_payload(session.id, code, family.id, child.id)
    await audit_from_request(
        request, db, family.id, user.id, "pairing.create",
        f"إنشاء رمز اقتران للطفل: {child.name}",
        f"Created pairing code for child: {child.name}",
        metadata={"session_id": session.id, "child_id": child.id},
    )
    await db.commit()
    await db.refresh(session)
    return PairingSessionResponse.model_validate(session)


@router.get(
    "/families/{family_id}/pairing/{session_id}",
    response_model=PairingSessionResponse,
)
async def get_pairing_status(
    family_id: str,
    session_id: str,
    ctx: tuple[Family, FamilyMembership] = Depends(require_family_permission("view_devices")),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    session = await db.get(PairingSession, session_id)
    if not session or session.family_id != family_id:
        raise HTTPException(status_code=404, detail="Pairing session not found")

    # Auto-expire if past TTL
    if session.status == "ready" and datetime.utcnow() > session.expires_at:
        session.status = "expired"
        session.failure_reason = "TTL expired"
        await db.commit()
        await db.refresh(session)

    return PairingSessionResponse.model_validate(session)


@router.post(
    "/families/{family_id}/pairing/{session_id}/cancel",
    response_model=MessageResponse,
)
async def cancel_pairing(
    family_id: str,
    session_id: str,
    request: Request,
    ctx: tuple[Family, FamilyMembership] = Depends(require_family_permission("manage_rules")),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    family, _ = ctx
    session = await db.get(PairingSession, session_id)
    if not session or session.family_id != family.id:
        raise HTTPException(status_code=404, detail="Pairing session not found")
    if session.status == "linked":
        raise HTTPException(status_code=400, detail="Session already linked — cannot cancel")
    session.status = "expired"
    session.failure_reason = "Cancelled by parent"
    await audit_from_request(
        request, db, family.id, user.id, "pairing.cancel",
        f"إلغاء رمز اقتران {session_id}",
        f"Cancelled pairing code {session_id}",
        metadata={"session_id": session_id},
    )
    await db.commit()
    return MessageResponse(message="Pairing session cancelled")


@router.post(
    "/families/{family_id}/pairing/{session_id}/regenerate",
    response_model=PairingSessionResponse,
)
async def regenerate_pairing(
    family_id: str,
    session_id: str,
    request: Request,
    ctx: tuple[Family, FamilyMembership] = Depends(require_family_permission("manage_rules")),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    family, _ = ctx
    session = await db.get(PairingSession, session_id)
    if not session or session.family_id != family.id:
        raise HTTPException(status_code=404, detail="Pairing session not found")
    if session.status == "linked":
        raise HTTPException(status_code=400, detail="Session already linked — regenerate a new one")

    # Generate fresh code
    for _ in range(5):
        new_code = generate_pairing_code()
        exists = (await db.execute(select(PairingSession).where(PairingSession.code == new_code))).scalar_one_or_none()
        if not exists:
            break

    session.code = new_code
    session.status = "ready"
    session.failure_reason = None
    session.expires_at = datetime.utcnow() + timedelta(seconds=settings.pairing_code_ttl_seconds)
    session.qr_payload = build_pairing_payload(session.id, new_code, family.id, session.child_id)
    await audit_from_request(
        request, db, family.id, user.id, "pairing.regenerate",
        f"توليد رمز اقتران جديد للجلسة {session_id}",
        f"Regenerated pairing code for session {session_id}",
        metadata={"session_id": session_id},
    )
    await db.commit()
    await db.refresh(session)
    return PairingSessionResponse.model_validate(session)


# ─── Child-side: consume the QR ──────────────────────


@router.post("/consume", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
async def consume_pairing_code(
    payload: PairingConsume,
    request: Request,
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    """Public endpoint — the child device calls this after scanning the QR.

    Steps:
      1. Look up session by code (must be in `ready` status, not expired)
      2. Mark as `scanning` then `verifying`
      3. Create a Device record linked to the child
      4. Mark session as `linked` and set consumed_at
      5. Return the new Device

    If anything fails, mark session as `failed` with a reason.
    """
    # Lookup
    session = (
        await db.execute(select(PairingSession).where(PairingSession.code == payload.code))
    ).scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Invalid pairing code")
    if session.status == "linked":
        raise HTTPException(status_code=410, detail="This code has already been used")
    if session.status in ("expired", "failed"):
        raise HTTPException(status_code=410, detail=f"This code is {session.status}")
    if datetime.utcnow() > session.expires_at:
        session.status = "expired"
        session.failure_reason = "TTL expired during consume"
        await db.commit()
        raise HTTPException(status_code=410, detail="This code has expired")

    # Move to scanning → verifying
    session.status = "scanning"
    session.attempts += 1
    await db.flush()

    session.status = "verifying"
    await db.flush()

    # Verify the child exists
    child = await db.get(Child, session.child_id)
    if not child:
        session.status = "failed"
        session.failure_reason = "Child not found"
        await db.commit()
        raise HTTPException(status_code=404, detail="Child not found — pairing failed")

    # Create the device
    device = Device(
        child_id=child.id,
        label=payload.device_label,
        brand=payload.brand,
        os=payload.os,
        os_version=payload.os_version,
        app_version=payload.app_version,
        status="online",
        capabilities=payload.capabilities,
        last_seen_at=datetime.utcnow(),
        last_sync_at=datetime.utcnow(),
    )
    db.add(device)
    await db.flush()
    session.device_id = device.id
    session.status = "linked"
    session.consumed_at = datetime.utcnow()

    await audit_from_request(
        request, db, session.family_id, session.issued_by, "pairing.linked",
        f"ربط جهاز بنجاح للطفل: {child.name} ({payload.brand})",
        f"Device paired successfully for child: {child.name} ({payload.brand})",
        metadata={
            "session_id": session.id, "child_id": child.id, "device_id": device.id,
            "brand": payload.brand,
        },
        # No authenticated user here — pass empty values
    )

    # Notify the parent device via FCM + WebSocket that the device was linked
    from ...core.fcm import build_pairing_linked_payload, notify_family_parents
    from .ws import broadcast_to_family
    payload_notif = build_pairing_linked_payload(child.name, payload.device_label)
    await broadcast_to_family(session.family_id, {
        "type": "pairing.linked",
        "child_id": child.id, "device_id": device.id,
        "device_label": payload.device_label, "brand": payload.brand,
    })
    await notify_family_parents(session.family_id, payload_notif, db=db)

    await db.commit()
    await db.refresh(device)
    return DeviceResponse.model_validate(device)


@router.get("/consume/{code}/preview")
async def preview_pairing(
    code: str,
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    """Allow the child device to preview the family/child info BEFORE confirming
    the link — so the user can verify they're linking to the right family."""
    session = (
        await db.execute(select(PairingSession).where(PairingSession.code == code))
    ).scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Invalid pairing code")
    if session.status == "linked":
        raise HTTPException(status_code=410, detail="This code has already been used")
    if datetime.utcnow() > session.expires_at:
        raise HTTPException(status_code=410, detail="This code has expired")

    child = await db.get(Child, session.child_id)
    family = await db.get(Family, session.family_id)
    if not child or not family:
        raise HTTPException(status_code=404, detail="Pairing target no longer exists")

    return {
        "session_id": session.id,
        "status": session.status,
        "expires_at": session.expires_at.isoformat(),
        "family_name": family.name,
        "child_name": child.name,
        "child_avatar_color": child.avatar_color,
        "child_avatar_initials": child.avatar_initials,
    }
