"""MD.Family Backend — Location, geofencing & SOS endpoints."""

from __future__ import annotations

import math
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..deps import audit_from_request, get_current_user, require_family_permission
from ...models import (
    ActivityEvent, Child, Family, FamilyMembership, LocationSample, SafeZone, User,
)
from ...schemas import (
    LocationSampleCreate, LocationSampleResponse,
    MessageResponse, SafeZoneCreate, SafeZoneResponse,
)

router = APIRouter(prefix="/families/{family_id}", tags=["location"])


def _haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Distance between two coordinates in meters (Haversine)."""
    R = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlmb / 2) ** 2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))


@router.get("/children/{child_id}/location/latest", response_model=LocationSampleResponse)
async def get_latest_location(
    family_id: str,
    child_id: str,
    ctx: tuple[Family, FamilyMembership] = Depends(require_family_permission("view_children")),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    family, _ = ctx
    res = await db.execute(
        select(LocationSample)
        .join(Child, LocationSample.child_id == Child.id)
        .where(Child.id == child_id, Child.family_id == family.id)
        .order_by(desc(LocationSample.captured_at))
        .limit(1)
    )
    sample = res.scalar_one_or_none()
    if not sample:
        raise HTTPException(status_code=404, detail="No location samples yet")
    return LocationSampleResponse.model_validate(sample)


@router.get("/children/{child_id}/location/history", response_model=list[LocationSampleResponse])
async def get_location_history(
    family_id: str,
    child_id: str,
    limit: int = Query(100, ge=1, le=1000),
    ctx: tuple[Family, FamilyMembership] = Depends(require_family_permission("view_children")),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    family, _ = ctx
    res = await db.execute(
        select(LocationSample)
        .join(Child, LocationSample.child_id == Child.id)
        .where(Child.id == child_id, Child.family_id == family.id)
        .order_by(desc(LocationSample.captured_at))
        .limit(limit)
    )
    return [LocationSampleResponse.model_validate(s) for s in res.scalars().all()]


@router.post(
    "/children/{child_id}/location",
    response_model=LocationSampleResponse,
    status_code=201,
)
async def report_location(
    family_id: str,
    child_id: str,
    payload: LocationSampleCreate,
    request: Request,
    ctx: tuple[Family, FamilyMembership] = Depends(require_family_permission("view_children")),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    """Ingest a location sample from a child device."""
    family, _ = ctx
    sample = LocationSample(
        child_id=child_id,
        lat=payload.lat, lng=payload.lng, accuracy_meters=payload.accuracy_meters,
        speed_kmh=payload.speed_kmh, battery_pct=payload.battery_pct,
        source=payload.source,
        captured_at=payload.captured_at or datetime.utcnow(),
    )
    db.add(sample)
    await db.flush()

    # Check geofences — emit activity events on entry/exit
    zones_q = await db.execute(select(SafeZone).where(SafeZone.family_id == family.id, SafeZone.enabled == True))
    for zone in zones_q.scalars().all():
        d = _haversine_m(payload.lat, payload.lng, zone.lat, zone.lng)
        if d <= zone.radius_meters:
            # Could emit zone_enter event here if not recently in zone
            pass
        # (Full enter/exit tracking needs previous-sample state — keep simple for v1)

    await db.commit()
    await db.refresh(sample)
    return LocationSampleResponse.model_validate(sample)


# ─── Safe zones (geofences) ───────────────────────────


@router.get("/safe-zones", response_model=list[SafeZoneResponse])
async def list_safe_zones(
    family_id: str,
    ctx: tuple[Family, FamilyMembership] = Depends(require_family_permission("view_children")),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    family, _ = ctx
    res = await db.execute(
        select(SafeZone).where(SafeZone.family_id == family.id).order_by(SafeZone.created_at)
    )
    return [SafeZoneResponse.model_validate(z) for z in res.scalars().all()]


@router.post("/safe-zones", response_model=SafeZoneResponse, status_code=201)
async def create_safe_zone(
    family_id: str,
    payload: SafeZoneCreate,
    request: Request,
    ctx: tuple[Family, FamilyMembership] = Depends(require_family_permission("manage_rules")),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    family, _ = ctx
    zone = SafeZone(
        family_id=family.id, name=payload.name, kind=payload.kind,
        lat=payload.lat, lng=payload.lng, radius_meters=payload.radius_meters,
        address=payload.address, enabled=payload.enabled,
    )
    db.add(zone)
    await audit_from_request(
        request, db, family.id, user.id, "zone.create",
        f"إضافة منطقة آمنة: {payload.name}",
        f"Created safe zone: {payload.name}",
        metadata={"zone_id": zone.id, "name": payload.name},
    )
    await db.commit()
    await db.refresh(zone)
    return SafeZoneResponse.model_validate(zone)


@router.delete("/safe-zones/{zone_id}", response_model=MessageResponse)
async def delete_safe_zone(
    family_id: str,
    zone_id: str,
    request: Request,
    ctx: tuple[Family, FamilyMembership] = Depends(require_family_permission("manage_rules")),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    family, _ = ctx
    zone = await db.get(SafeZone, zone_id)
    if not zone or zone.family_id != family.id:
        raise HTTPException(status_code=404, detail="Safe zone not found")
    await db.delete(zone)
    await audit_from_request(
        request, db, family.id, user.id, "zone.delete",
        f"حذف منطقة آمنة: {zone.name}",
        f"Deleted safe zone: {zone.name}",
        metadata={"zone_id": zone_id},
    )
    await db.commit()
    return MessageResponse(message="Safe zone deleted")


# ─── SOS ─────────────────────────────────────────────


@router.post("/children/{child_id}/sos", status_code=202)
async def trigger_sos(
    family_id: str,
    child_id: str,
    request: Request,
    ctx: tuple[Family, FamilyMembership] = Depends(require_family_permission("view_children")),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    """Trigger an SOS alert from the child's device.

    Returns 202 (Accepted) — the alert is queued for delivery via WebSocket
    and FCM push notification to all authorized contacts (parents).
    """
    family, _ = ctx
    child = await db.get(Child, child_id)
    if not child or child.family_id != family.id:
        raise HTTPException(status_code=404, detail="Child not found")

    # Get latest location to attach
    latest = (
        await db.execute(
            select(LocationSample)
            .where(LocationSample.child_id == child_id)
            .order_by(desc(LocationSample.captured_at))
            .limit(1)
        )
    ).scalar_one_or_none()

    event = ActivityEvent(
        family_id=family.id, child_id=child_id, type="sos",
        label_ar=f"تنبيه SOS من {child.name}",
        label_en=f"SOS alert from {child.name}",
        severity="critical",
        meta={
            "lat": latest.lat if latest else None,
            "lng": latest.lng if latest else None,
            "captured_at": latest.captured_at.isoformat() if latest else None,
        },
    )
    db.add(event)
    await audit_from_request(
        request, db, family.id, user.id, "sos.trigger",
        f"SOS من {child.name}",
        f"SOS from {child.name}",
        metadata={"child_id": child_id, "lat": latest.lat if latest else None, "lng": latest.lng if latest else None},
    )
    await db.flush()

    # Broadcast via WebSocket (real-time) + FCM push (offline delivery)
    from ...core.fcm import build_sos_payload, notify_family_parents
    from .ws import broadcast_to_family
    payload = build_sos_payload(
        child_id=child.id, child_name=child.name,
        lat=latest.lat if latest else None, lng=latest.lng if latest else None,
    )
    # WebSocket fan-out (synchronous, real-time, requires open connection)
    await broadcast_to_family(family.id, {
        **payload, "child_id": child.id, "event_id": event.id,
    })
    # FCM fan-out (asynchronous, for offline parents)
    await notify_family_parents(family.id, payload, db=db)

    await db.commit()
    return {
        "status": "accepted",
        "message": "SOS alert sent",
        "event_id": event.id,
        "broadcast": "websocket+push",
    }
