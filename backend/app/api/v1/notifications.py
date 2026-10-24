"""
MD.Family Backend — Device token (FCM) registration & notification endpoints.

POST   /api/v1/devices/{device_id}/register-token  — child device registers its FCM token
POST   /api/v1/me/register-token                    — parent device registers its FCM token
DELETE /api/v1/devices/{device_id}/register-token    — deactivate a child device token
POST   /api/v1/devices/{device_id}/test-notification — parent sends a test push to a device
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..deps import audit_from_request, get_current_user, require_family_permission
from ...core.fcm import (
    build_sos_payload,
    is_fcm_enabled,
    send_to_token,
)
from ...models import Child, Device, DeviceToken, Family, FamilyMembership, User

router = APIRouter(tags=["notifications"])


# ─── Schemas ─────────────────────────────────────────


class TokenRegister(BaseModel):
    """Body for registering an FCM token."""
    token: str = Field(..., min_length=10, max_length=512)
    platform: str = Field("android", pattern="^(android|ios|web)$")
    app_version: Optional[str] = None
    locale: str = Field("ar", pattern="^(ar|en)$")


class TokenResponse(BaseModel):
    id: str
    token: str  # we always return the token, never mask (client already has it)
    platform: str
    app_version: Optional[str] = None
    locale: str = "ar"
    is_active: bool
    registered_at: datetime
    last_used_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TestNotificationRequest(BaseModel):
    title: str = Field("Test from MD.Family")
    body: str = Field("This is a test push notification.")


# ─── Child-device endpoint: register token ────────────


@router.post(
    "/devices/{device_id}/register-token",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register_child_device_token(
    device_id: str,
    payload: TokenRegister,
    request: Request,
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    """Register an FCM token for a child device.

    Public endpoint — called by the child device itself right after pairing,
    once it obtains an FCM token from Firebase. The device_id is verified by
    the device lookup, and the family is derived from it.
    """
    device = await db.get(Device, device_id)
    if not device or device.is_deleted:
        raise HTTPException(status_code=404, detail="Device not found")

    # Check if token already exists (idempotent registration)
    existing = (
        await db.execute(select(DeviceToken).where(DeviceToken.token == payload.token))
    ).scalar_one_or_none()
    if existing:
        existing.is_active = True
        existing.last_used_at = datetime.utcnow()
        existing.device_id = device.id
        existing.app_version = payload.app_version or existing.app_version
        existing.locale = payload.locale
        await db.commit()
        await db.refresh(existing)
        return TokenResponse.model_validate(existing)

    token = DeviceToken(
        token=payload.token,
        device_id=device.id,
        user_id=None,
        platform=payload.platform,
        app_version=payload.app_version,
        locale=payload.locale,
        last_used_at=datetime.utcnow(),
    )
    db.add(token)
    await db.commit()
    await db.refresh(token)
    return TokenResponse.model_validate(token)


# ─── Parent-device endpoint: register token ───────────


@router.post(
    "/me/register-token",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register_parent_token(
    payload: TokenRegister,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    """Register an FCM token for the parent's own device (the parent app).

    Used so the parent can receive SOS alerts, safety alerts, extension
    requests, pairing confirmations, etc.
    """
    existing = (
        await db.execute(select(DeviceToken).where(DeviceToken.token == payload.token))
    ).scalar_one_or_none()
    if existing:
        existing.is_active = True
        existing.user_id = user.id
        existing.device_id = None  # parent device, not a child device
        existing.last_used_at = datetime.utcnow()
        existing.app_version = payload.app_version or existing.app_version
        existing.locale = payload.locale
        await db.commit()
        await db.refresh(existing)
        return TokenResponse.model_validate(existing)

    token = DeviceToken(
        token=payload.token,
        device_id=None,
        user_id=user.id,
        platform=payload.platform,
        app_version=payload.app_version,
        locale=payload.locale,
        last_used_at=datetime.utcnow(),
    )
    db.add(token)
    await db.commit()
    await db.refresh(token)
    return TokenResponse.model_validate(token)


# ─── Deactivate a token ─────────────────────────────


@router.delete("/devices/{device_id}/register-token", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_child_device_token(
    device_id: str,
    request: Request,
    ctx: tuple[Family, FamilyMembership] = Depends(require_family_permission("view_devices")),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
):
    """Deactivate all FCM tokens for a child device (e.g. before unpairing)."""
    family, _ = ctx
    res = await db.execute(
        select(DeviceToken).join(Device, DeviceToken.device_id == Device.id).where(
            Device.id == device_id, Device.child_id.in_(
                select(Child.id).where(Child.family_id == family.id)
            )
        )
    )
    for token in res.scalars().all():
        token.is_active = False
    await db.commit()


# ─── Test notification ───────────────────────────────


@router.post("/devices/{device_id}/test-notification")
async def send_test_notification(
    device_id: str,
    payload: TestNotificationRequest,
    request: Request,
    ctx: tuple[Family, FamilyMembership] = Depends(require_family_permission("view_children")),
    db: AsyncSession = Depends(get_db := __import__("app.core.database", fromlist=["get_db"]).get_db),
    user: User = Depends(get_current_user),
):
    """Send a test push notification to a child device.

    Used by the parent UI to verify push delivery is working.
    """
    family, _ = ctx
    device = await db.get(Device, device_id)
    if not device or device.is_deleted:
        raise HTTPException(status_code=404, detail="Device not found")

    # Verify device belongs to this family
    child = await db.get(Child, device.child_id)
    if not child or child.family_id != family.id:
        raise HTTPException(status_code=403, detail="Device does not belong to your family")

    # Get active tokens for the device
    tokens_q = await db.execute(
        select(DeviceToken).where(
            DeviceToken.device_id == device_id,
            DeviceToken.is_active == True,
        )
    )
    tokens = [t.token for t in tokens_q.scalars().all()]
    if not tokens:
        raise HTTPException(status_code=404, detail="No registered FCM token for this device")

    test_payload = {
        "type": "test.notification",
        "title": payload.title,
        "body": payload.body,
        "priority": "normal",
        "category_id": "default",
    }

    sent = 0
    for token in tokens:
        if await send_to_token(token, test_payload):
            sent += 1

    await audit_from_request(
        request, db, family.id, user.id, "notification.test",
        f"إرسال إشعار اختبار للجهاز {device.label}",
        f"Sent test notification to device {device.label}",
        metadata={"device_id": device_id, "sent": sent, "total": len(tokens)},
    )
    await db.commit()
    return {
        "sent": sent,
        "total": len(tokens),
        "fcm_enabled": is_fcm_enabled(),
        "message": "Test notification queued" if sent > 0 else "FCM not configured (dev mode logged only)",
    }


# ─── Notification channels info ──────────────────────


@router.get("/notifications/channels")
async def list_notification_channels():
    """Return the list of Android notification channels the app should create.

    The Android app fetches this once at startup and creates the channels
    via `NotificationManager.createNotificationChannel(...)`.
    """
    return {
        "channels": [
            {
                "id": "mdfamily_sos",
                "name_ar": "استغاثات SOS",
                "name_en": "SOS Alerts",
                "importance": "HIGH",
                "description": "تنبيهات استغاثة SOS من الأطفال",
                "vibration": True,
                "sound": True,
                "lights": True,
            },
            {
                "id": "mdfamily_alerts",
                "name_ar": "تنبيهات السلامة",
                "name_en": "Safety Alerts",
                "importance": "HIGH",
                "description": "تنبيهات السلامة الاجتماعية (تنمر، محتوى غير مناسب)",
                "vibration": True,
                "sound": True,
            },
            {
                "id": "mdfamily_requests",
                "name_ar": "طلبات وقت إضافي",
                "name_en": "Time Requests",
                "importance": "DEFAULT",
                "description": "طلبات الوقت الإضافي وقرارات الوالد",
                "vibration": True,
                "sound": True,
            },
            {
                "id": "mdfamily_protection",
                "name_ar": "حالة الحماية",
                "name_en": "Protection Status",
                "importance": "LOW",
                "description": "حالة محرك الحماية (MD-Sabry) وتحديثات السياسات",
                "vibration": False,
                "sound": False,
            },
            {
                "id": "mdfamily_location",
                "name_ar": "أحداث الموقع",
                "name_en": "Location Events",
                "importance": "DEFAULT",
                "description": "دخول/خروج المنطقة الآمنة",
                "vibration": True,
                "sound": True,
            },
            {
                "id": "mdfamily_live",
                "name_ar": "الجلسات الحية",
                "name_en": "Live Sessions",
                "importance": "HIGH",
                "description": "بدء/إنهاء جلسة مشاهدة الشاشة أو الصوت",
                "vibration": True,
                "sound": True,
            },
            {
                "id": "mdfamily_general",
                "name_ar": "عام",
                "name_en": "General",
                "importance": "DEFAULT",
                "description": "إشعارات عامة (ربط جهاز، تأكيدات)",
                "vibration": True,
                "sound": True,
            },
        ]
    }
