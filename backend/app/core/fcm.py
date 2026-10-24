"""
MD.Family Backend — Firebase Cloud Messaging (FCM) service.

Sends push notifications to parent/child devices. Supports:
  - SOS alerts (high priority)
  - Safety alert created
  - Extension request received (parent side)
  - Extension request decided (child side)
  - Policy updated (push new rules to child device)
  - Pairing linked
  - Geofence enter/exit events
  - Live session started/ended

Two delivery modes:
  1) Production: uses a Firebase service account JSON (set MDFAMILY_FIREBASE_SERVICE_ACCOUNT_PATH)
  2) Dev/no-config: logs the notification to the backend log instead of sending it

The dev mode is essential so the rest of the system can be developed and tested
without a real Firebase project.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Optional

from .config import settings

logger = logging.getLogger("mdfamily.fcm")

# Lazy-loaded Firebase app + messaging instance
_firebase_app: Any = None
_messaging: Any = None
_initialized = False


def _initialize_firebase() -> None:
    """Initialize the Firebase Admin SDK using a service account JSON file.

    Reads the path from `MDFAMILY_FIREBASE_SERVICE_ACCOUNT_PATH`.
    If not set or the file is missing, we stay in "dev mode" (log only).
    """
    global _firebase_app, _messaging, _initialized
    if _initialized:
        return
    _initialized = True

    path = settings.firebase_service_account_path
    if not path:
        logger.info(
            "[FCM] No service account configured — running in dev mode (notifications logged, not sent). "
            "Set MDFAMILY_FIREBASE_SERVICE_ACCOUNT_PATH to enable real FCM delivery."
        )
        return

    try:
        import firebase_admin
        from firebase_admin import credentials, messaging
        cred = credentials.Certificate(path)
        _firebase_app = firebase_admin.initialize_app(cred, name="mdfamily")
        _messaging = messaging
        logger.info("[FCM] Firebase Admin SDK initialized from %s", path)
    except Exception as exc:
        logger.warning("[FCM] Failed to initialize Firebase: %s", exc)
        _firebase_app = None
        _messaging = None


def is_fcm_enabled() -> bool:
    """True if real FCM delivery is configured."""
    _initialize_firebase()
    return _messaging is not None


# ─── Notification payload builders ────────────────────


def build_sos_payload(child_id: str, child_name: str, lat: Optional[float], lng: Optional[float]) -> dict[str, Any]:
    return {
        "type": "sos.triggered",
        "title": "🚨 SOS — تنبيه استغاثة",
        "body": f"استغاثة من {child_name}",
        "child_id": child_id,
        "lat": lat,
        "lng": lng,
        "priority": "high",
        "category": "sos",
    }


def build_alert_payload(child_name: str, severity: str, category: str, reason_ar: str) -> dict[str, Any]:
    return {
        "type": "alert.created",
        "title": "⚠️ تنبيه سلامة جديد",
        "body": f"{child_name}: {reason_ar[:80]}",
        "severity": severity,
        "category": category,
        "priority": "high" if severity in ("high", "critical") else "normal",
        "category_id": "alert",
    }


def build_extension_request_payload(child_name: str, app_name: str, minutes: int) -> dict[str, Any]:
    return {
        "type": "extension.requested",
        "title": "⏰ طلب وقت إضافي",
        "body": f"{child_name} يطلب {minutes} دقيقة إضافية لـ {app_name}",
        "priority": "normal",
        "category_id": "extension_request",
    }


def build_policy_updated_payload(child_id: str, version: int) -> dict[str, Any]:
    return {
        "type": "policy.updated",
        "title": "🔄 تحديث القواعد",
        "body": "تم تحديث سياسات الحماية على جهازك",
        "child_id": child_id,
        "policy_version": version,
        "priority": "high",
        "category_id": "policy_update",
    }


def build_pairing_linked_payload(child_name: str, device_label: str) -> dict[str, Any]:
    return {
        "type": "pairing.linked",
        "title": "✅ تم ربط جهاز",
        "body": f"تم ربط جهاز {device_label} للطفل {child_name}",
        "priority": "normal",
        "category_id": "pairing",
    }


def build_zone_event_payload(child_name: str, zone_name: str, kind: str) -> dict[str, Any]:
    """kind: 'enter' or 'exit'."""
    ar = "دخل" if kind == "enter" else "غادر"
    return {
        "type": f"zone.{kind}",
        "title": f"📍 {ar} منطقة آمنة",
        "body": f"{child_name} {ar} منطقة {zone_name}",
        "priority": "normal",
        "category_id": "zone_event",
    }


def build_live_session_payload(child_name: str, session_kind: str, action: str) -> dict[str, Any]:
    """action: 'requested' | 'active' | 'ended'."""
    ar_kind = {
        "screen_view": "مشاهدة الشاشة",
        "voice_call": "مكالمة صوتية",
        "ambient_audio": "صوت المحيط",
    }.get(session_kind, session_kind)
    ar_action = {
        "requested": "طلب جلسة",
        "active": "بدأت الجلسة",
        "ended": "انتهت الجلسة",
    }.get(action, action)
    return {
        "type": f"session.{action}",
        "title": f"🎥 {ar_action}: {ar_kind}",
        "body": f"{child_name} — {ar_kind}",
        "priority": "high",
        "category_id": "live_session",
    }


def build_extension_decided_payload(decision: str, minutes: int) -> dict[str, Any]:
    ar = "قبول" if decision == "approved" else "رفض"
    return {
        "type": "extension.decided",
        "title": f"{'✅' if decision == 'approved' else '❌'} {ar} طلب الوقت الإضافي",
        "body": f"تم {ar} طلب {minutes} دقيقة",
        "priority": "normal",
        "category_id": "extension_decision",
    }


def build_family_pause_payload(active: bool) -> dict[str, Any]:
    return {
        "type": "family_pause" + ("_activated" if active else "_deactivated"),
        "title": "⏸️ إيقاف الإنترنت" if active else "▶️ استئناف الإنترنت",
        "body": "تم إيقاف/استئناف الإنترنت على جهازك" ,
        "priority": "high",
        "category_id": "family_pause",
    }


# ─── Send helpers ────────────────────────────────────


async def send_to_token(token: str, payload: dict[str, Any]) -> bool:
    """Send a notification to a single FCM device token.

    Returns True on success, False on failure (including dev-mode log).
    """
    _initialize_firebase()

    # Dev mode — log instead of sending
    if not _messaging:
        logger.info("[FCM-DEV] would send to token=%s... payload=%s", token[:20], json.dumps(payload, ensure_ascii=False))
        return True

    # Build FCM message (HTTP v1 format)
    from firebase_admin import messaging as _m
    try:
        message = _m.Message(
            data={k: str(v) for k, v in payload.items() if k not in ("title", "body", "priority", "category_id")},
            notification=_m.Notification(
                title=payload.get("title", "MD.Family"),
                body=payload.get("body", ""),
            ),
            android=_m.AndroidConfig(
                priority=payload.get("priority", "normal"),
                notification=_m.AndroidNotification(
                    channel_id=_android_channel_for(payload.get("category_id", "default")),
                    icon="ic_stat_mdfamily",
                    color="#005C9E",
                    priority=payload.get("priority", "default"),
                    tag=payload.get("type"),
                ),
            ),
            token=token,
        )
        response = _m.send(message, app=_firebase_app)
        logger.info("[FCM] sent message_id=%s type=%s", response, payload.get("type"))
        return True
    except Exception as exc:
        logger.warning("[FCM] failed to send to token=%s...: %s", token[:20], exc)
        return False


async def send_to_tokens(tokens: list[str], payload: dict[str, Any]) -> dict[str, int]:
    """Send a notification to multiple FCM device tokens.

    Returns a dict: {"sent": N, "failed": N}.
    """
    if not tokens:
        return {"sent": 0, "failed": 0}

    sent = 0
    failed = 0
    for token in tokens:
        ok = await send_to_token(token, payload)
        if ok:
            sent += 1
        else:
            failed += 1
    return {"sent": sent, "failed": failed}


# ─── Notification channels (Android) ─────────────────


def _android_channel_for(category_id: str) -> str:
    """Map a notification category to its Android channel ID."""
    channels = {
        "sos": "mdfamily_sos",
        "alert": "mdfamily_alerts",
        "extension_request": "mdfamily_requests",
        "extension_decision": "mdfamily_requests",
        "policy_update": "mdfamily_protection",
        "pairing": "mdfamily_general",
        "zone_event": "mdfamily_location",
        "live_session": "mdfamily_live",
        "family_pause": "mdfamily_protection",
        "default": "mdfamily_general",
    }
    return channels.get(category_id, channels["default"])


# ─── High-level convenience helpers ──────────────────


async def notify_family_parents(family_id: str, payload: dict[str, Any], db=None) -> None:
    """Send a notification to all parent devices in a family.

    Looks up the family's parent tokens from the `device_tokens` table
    (when db is provided) and sends to each.
    """
    if db is None:
        # Can't look up tokens without a DB session — just log
        logger.info("[FCM] notify_family_parents called without db; skipping token lookup")
        return

    from sqlalchemy import select
    from ..models import DeviceToken, FamilyMembership, User
    # Find parent memberships for this family
    parent_q = select(FamilyMembership).where(
        FamilyMembership.family_id == family_id,
        FamilyMembership.role.in_(["primary_owner", "father", "mother"]),
    )
    res = await db.execute(parent_q)
    parent_ids = [m.user_id for m in res.scalars().all()]
    if not parent_ids:
        return

    # Tokens registered for these users (parent device tokens)
    token_q = select(DeviceToken).where(DeviceToken.user_id.in_(parent_ids))
    res = await db.execute(token_q)
    tokens = [t.token for t in res.scalars().all() if t.is_active]
    if not tokens:
        logger.info("[FCM] no parent tokens registered for family %s", family_id)
        return

    await send_to_tokens(tokens, payload)


async def notify_child_device(child_id: str, payload: dict[str, Any], db=None) -> None:
    """Send a notification to all devices belonging to a child."""
    if db is None:
        return

    from sqlalchemy import select
    from ..models import DeviceToken, Device
    token_q = (
        select(DeviceToken)
        .join(Device, DeviceToken.device_id == Device.id)
        .where(Device.child_id == child_id, DeviceToken.is_active == True)
    )
    res = await db.execute(token_q)
    tokens = [t.token for t in res.scalars().all()]
    if not tokens:
        logger.info("[FCM] no tokens registered for child %s", child_id)
        return

    await send_to_tokens(tokens, payload)
