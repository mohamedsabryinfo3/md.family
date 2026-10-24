"""
MD.Family Backend — security primitives.

JWT issue/verify, password hashing (bcrypt), and Google ID token verification.
"""

from __future__ import annotations

import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import httpx
from jose import JWTError, jwt
from passlib.context import CryptContext

from .config import settings

# ─── Password hashing ────────────────────────────────


_pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=settings.bcrypt_rounds,
)


def hash_password(plain: str) -> str:
    return _pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _pwd_context.verify(plain, hashed)
    except (ValueError, TypeError):
        return False


# ─── JWT ──────────────────────────────────────────────


def _now() -> datetime:
    return datetime.now(timezone.utc)


def create_access_token(
    subject: str,
    extra_claims: Optional[dict[str, Any]] = None,
    expires_in_minutes: Optional[int] = None,
) -> str:
    """Create a signed JWT access token."""
    ttl = expires_in_minutes or settings.jwt_access_token_expire_minutes
    now = _now()
    payload: dict[str, Any] = {
        "sub": subject,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=ttl)).timestamp()),
        "jti": str(uuid.uuid4()),
        "typ": "access",
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_refresh_token(subject: str) -> str:
    """Create a signed JWT refresh token (longer TTL)."""
    now = _now()
    payload = {
        "sub": subject,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=settings.jwt_refresh_token_expire_days)).timestamp()),
        "jti": str(uuid.uuid4()),
        "typ": "refresh",
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> Optional[dict[str, Any]]:
    """Decode & verify a JWT. Returns None on failure."""
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None


def is_token_expired(token: str) -> bool:
    """Returns True if the token's `exp` is in the past."""
    payload = decode_token(token)
    if not payload:
        return True
    exp = payload.get("exp")
    if not exp:
        return True
    return time.time() >= int(exp)


# ─── Google OAuth ────────────────────────────────────

GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


async def verify_google_id_token(id_token: str) -> Optional[dict[str, Any]]:
    """
    Verify a Google ID token by calling Google's tokeninfo endpoint.
    Returns the user info dict if valid, else None.

    In production you should use google-auth-library-python for proper
    signature verification — this endpoint-based check is OK for the
    first iteration but the library is recommended.
    """
    if not settings.google_client_id:
        return None
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                GOOGLE_TOKENINFO_URL,
                params={"id_token": id_token},
            )
            if r.status_code != 200:
                return None
            data = r.json()
            # Confirm the audience matches our client ID
            if data.get("aud") != settings.google_client_id:
                return None
            return data
    except (httpx.HTTPError, ValueError):
        return None


async def exchange_google_code(code: str) -> Optional[dict[str, Any]]:
    """Exchange an OAuth code for tokens + user info (server-side flow)."""
    if not settings.google_client_id or not settings.google_client_secret:
        return None
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            token_resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "redirect_uri": settings.google_oauth_redirect_url,
                    "grant_type": "authorization_code",
                },
            )
            if token_resp.status_code != 200:
                return None
            tokens = token_resp.json()
            # Fetch user info
            user_resp = await client.get(
                GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {tokens['access_token']}"},
            )
            if user_resp.status_code != 200:
                return None
            return {"tokens": tokens, "user": user_resp.json()}
    except (httpx.HTTPError, ValueError):
        return None


# ─── Pairing code ────────────────────────────────────


def generate_pairing_code() -> str:
    """Generate a 6-digit one-time pairing code (cryptographically random)."""
    import secrets
    alphabet = "0123456789"
    return "".join(secrets.choice(alphabet) for _ in range(settings.pairing_code_length))


# ─── Pairing QR content ──────────────────────────────


def build_pairing_payload(session_id: str, code: str, family_id: str, child_id: str) -> str:
    """Build the JSON payload encoded inside the pairing QR code."""
    import json
    return json.dumps(
        {
            "v": 1,
            "sid": session_id,
            "code": code,
            "fid": family_id,
            "cid": child_id,
            "iss": "MD.Family",
            "iat": int(time.time()),
        },
        separators=(",", ":"),
    )
