"""
MD.Family Backend — WebSocket handler for real-time family events.

Connect:   wss://api.mdfamily.com/api/v1/ws?token=<JWT>
Subscribe: the socket auto-binds to the user's family channels based on JWT.

Events emitted (server → client):
  - {"type": "pairing.linked",        "child_id": "...", "device_id": "..."}
  - {"type": "alert.created",         "alert": {...}}
  - {"type": "activity.created",      "event": {...}}
  - {"type": "session.requested",    "session": {...}}
  - {"type": "session.active",       "session": {...}}
  - {"type": "session.ended",        "session": {...}}
  - {"type": "sos.triggered",        "child_id": "...", "lat": ..., "lng": ...}
  - {"type": "zone.enter",            "child_id": "...", "zone_id": "..."}
  - {"type": "zone.exit",             "child_id": "...", "zone_id": "..."}
  - {"type": "extension.requested",  "request": {...}}
  - {"type": "extension.decided",    "request": {...}}

Events received (client → server):
  - {"type": "ping"}  → server replies {"type": "pong", "ts": "..."}
  - {"type": "subscribe", "channels": ["family:<id>", "child:<id>"]}
"""

from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select

from ...core.security import decode_token
from ...core.database import AsyncSessionLocal
from ...models import FamilyMembership

router = APIRouter(tags=["websocket"])

# Active connections grouped by family_id
_connections: dict[str, set[WebSocket]] = {}
_lock = asyncio.Lock()


async def _add_connection(family_id: str, ws: WebSocket) -> None:
    async with _lock:
        _connections.setdefault(family_id, set()).add(ws)


async def _remove_connection(family_id: str, ws: WebSocket) -> None:
    async with _lock:
        if family_id in _connections:
            _connections[family_id].discard(ws)
            if not _connections[family_id]:
                del _connections[family_id]


async def broadcast_to_family(family_id: str, event: dict[str, Any]) -> None:
    """Broadcast an event to all sockets subscribed to a family."""
    msg = json.dumps(event, default=str, ensure_ascii=False)
    async with _lock:
        sockets = list(_connections.get(family_id, set()))
    for ws in sockets:
        try:
            await ws.send_text(msg)
        except Exception:
            pass  # dead socket will be cleaned up on next read


@router.websocket("/ws")
async def websocket_endpoint(
    ws: WebSocket,
    token: str = Query(...),
):
    """Authenticates the WebSocket with a JWT in the query string."""
    payload = decode_token(token)
    if not payload or payload.get("typ") != "access":
        await ws.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id = payload.get("sub")
    if not user_id:
        await ws.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Resolve the user's families
    async with AsyncSessionLocal() as db:
        res = await db.execute(
            select(FamilyMembership).where(FamilyMembership.user_id == user_id)
        )
        memberships = res.scalars().all()
        family_ids = [m.family_id for m in memberships]

    if not family_ids:
        await ws.close(code=status.WS_1008_POLICY_VIOLATION, reason="No family memberships")
        return

    await ws.accept()

    # Subscribe to all the user's families
    for fid in family_ids:
        await _add_connection(fid, ws)

    try:
        await ws.send_text(json.dumps({
            "type": "connected",
            "families": family_ids,
            "ts": datetime.now(timezone.utc).isoformat(),
        }, ensure_ascii=False))

        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await ws.send_text(json.dumps({"type": "error", "detail": "Invalid JSON"}))
                continue

            if msg.get("type") == "ping":
                await ws.send_text(json.dumps({
                    "type": "pong",
                    "ts": datetime.now(timezone.utc).isoformat(),
                }))
            elif msg.get("type") == "subscribe":
                # Allow client to filter; we still broadcast to all family sockets
                await ws.send_text(json.dumps({"type": "subscribed", "channels": msg.get("channels", [])}))
    except WebSocketDisconnect:
        pass
    finally:
        for fid in family_ids:
            await _remove_connection(fid, ws)
