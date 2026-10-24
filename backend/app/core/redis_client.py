"""
MD.Family Backend — Redis client (with in-memory fallback).

When `REDIS_URL` is empty (dev default), we use `fakeredis` so the backend
runs without an external Redis dependency. In production, set `REDIS_URL`
to your real Redis instance.
"""

from __future__ import annotations

import json
from typing import Any, Optional

from .config import settings

_redis_client: Any = None
_is_fake: bool = False


def _make_client() -> Any:
    global _is_fake
    if settings.redis_url:
        try:
            import redis.asyncio as redis_async
            _is_fake = False
            return redis_async.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True,
            )
        except ImportError:
            pass  # fall through to fakeredis

    # Dev fallback: in-memory fakeredis (single instance, shared state)
    try:
        import fakeredis.aioredis as fakeredis_async
    except ImportError:
        # Last resort: a tiny dict-backed stub
        _is_fake = True
        return _DictRedis()

    _is_fake = True
    return fakeredis_async.FakeRedis(decode_responses=True)


class _DictRedis:
    """Tiny dict-backed stub when neither redis nor fakeredis is installed."""

    def __init__(self) -> None:
        self._store: dict[str, str] = {}
        self._pubsub: dict[str, list] = {}

    async def get(self, key: str) -> Optional[str]:
        return self._store.get(key)

    async def set(self, key: str, value: str, ex: Optional[int] = None) -> str:
        self._store[key] = value
        return "OK"

    async def setex(self, key: str, ttl: int, value: str) -> str:
        return await self.set(key, value, ex=ttl)

    async def delete(self, *keys: str) -> int:
        n = 0
        for k in keys:
            if k in self._store:
                del self._store[k]
                n += 1
        return n

    async def exists(self, key: str) -> int:
        return 1 if key in self._store else 0

    async def incr(self, key: str) -> int:
        v = int(self._store.get(key, "0")) + 1
        self._store[key] = str(v)
        return v

    async def expire(self, key: str, ttl: int) -> int:
        return 1 if key in self._store else 0

    async def publish(self, channel: str, message: str) -> int:
        for cb in self._pubsub.get(channel, []):
            await cb(message)
        return 1

    async def pubsub(self):
        return _DictPubSub(self._pubsub)


class _DictPubSub:
    def __init__(self, pubsub: dict[str, list]):
        self._pubsub = pubsub
        self._channels: list[str] = []

    async def subscribe(self, *channels: str) -> None:
        self._channels.extend(channels)
        for c in channels:
            self._pubsub.setdefault(c, [])

    async def unsubscribe(self, *channels: str) -> None:
        for c in channels:
            if c in self._channels:
                self._channels.remove(c)

    async def get_message(self, ignore_subscribe_messages: bool = False, timeout: float = 1.0):
        import asyncio
        await asyncio.sleep(timeout)
        return None

    async def close(self) -> None:
        self._channels.clear()


async def get_redis() -> Any:
    """Returns the Redis client (real or fake)."""
    global _redis_client
    if _redis_client is None:
        _redis_client = _make_client()
    return _redis_client


def is_fake_redis() -> bool:
    """True if we're using the in-memory fake (dev only)."""
    return _is_fake


# ─── High-level helpers used by services ──────────────


async def cache_get_json(key: str) -> Optional[Any]:
    """Get a JSON-serialized value from cache, or None if missing/expired."""
    r = await get_redis()
    raw = await r.get(key)
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return None


async def cache_set_json(key: str, value: Any, ttl: int = 300) -> None:
    """Set a JSON-serializable value in cache with a TTL (seconds)."""
    r = await get_redis()
    await r.setex(key, ttl, json.dumps(value, default=str))


async def cache_delete(key: str) -> None:
    r = await get_redis()
    await r.delete(key)


async def rate_limit_increment(key: str, ttl: int = 60) -> int:
    """Atomically increment a counter and return the new value."""
    r = await get_redis()
    n = await r.incr(key)
    if n == 1:
        await r.expire(key, ttl)
    return n
