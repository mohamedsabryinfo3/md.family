"""
MD.Family Backend — FastAPI dependencies for auth, RBAC, and audit logging.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.security import decode_token
from ..core.config import settings
from ..models import AuditLog, Family, FamilyMembership, User
from ..core.database import get_db


# ─── Auth: extract current user from JWT ─────────────


async def get_current_user(
    request: Request,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Verify the JWT in `Authorization: Bearer <token>` and return the User."""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization header — expected 'Bearer <token>'",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = parts[1]
    payload = decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if payload.get("typ") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Wrong token type",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Malformed token")

    user = await db.get(User, user_id)
    if not user or not user.is_active or user.is_deleted:
        raise HTTPException(status_code=401, detail="User not found or disabled")

    # Stash for downstream audit logging
    request.state.user_id = user.id
    request.state.ip_address = request.client.host if request.client else None
    request.state.user_agent = request.headers.get("user-agent")

    return user


# ─── RBAC: family scoping + permission checks ────────


async def get_user_family(
    family_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> tuple[Family, FamilyMembership]:
    """Resolve a family_id to the actual Family, ensuring the current user
    is an active member. Returns (Family, FamilyMembership).

    Raises 404 if family doesn't exist, 403 if user is not a member.
    """
    family = await db.get(Family, family_id)
    if not family or family.is_deleted:
        raise HTTPException(status_code=404, detail="Family not found")

    q = select(FamilyMembership).where(
        FamilyMembership.family_id == family_id,
        FamilyMembership.user_id == user.id,
    )
    res = await db.execute(q)
    membership = res.scalar_one_or_none()
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this family")

    return family, membership


def require_family_permission(required: str):
    """Returns a dependency that ensures the current user has the given
    permission on the family. Permission checks differ by role:
      - primary_owner / father: always allowed (full management)
      - mother with full_access: allowed except for sensitive features
        (live_screen_view, ambient_audio, voice_call) which still need
        explicit grants
      - mother with custom_access: must have `required` in their grants
      - mother with no_access: always 403
    """

    SENSITIVE_PERMS = {"live_screen_view", "ambient_audio", "voice_call"}

    async def _check(
        family_id: str,
        user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> tuple[Family, FamilyMembership]:
        family, membership = await get_user_family(family_id, user, db)

        role = membership.role
        if role in ("primary_owner", "father"):
            # Owner / father — full access, including sensitive features
            return family, membership

        # Mother — check access level
        level = membership.mother_access_level or "no_access"
        grants = membership.mother_grants or {}

        if level == "no_access":
            raise HTTPException(status_code=403, detail="Mother has no access to this family")

        if level == "full_access":
            # Full access — but sensitive features still need explicit grant
            if required in SENSITIVE_PERMS and not grants.get(required, False):
                raise HTTPException(
                    status_code=403,
                    detail=f"Sensitive permission '{required}' requires explicit grant",
                )
            return family, membership

        # custom_access — check explicit grant
        if not grants.get(required, False):
            raise HTTPException(
                status_code=403,
                detail=f"Permission '{required}' not granted to this account",
            )
        return family, membership

    return _check


async def require_family_owner(family_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> Family:
    """Dependency that ensures the user is the family's Primary Owner (father).

    Used for actions that only the father can perform:
      - invite mother, change mother permissions, transfer ownership (not implemented)
      - delete family
    """
    family, membership = await get_user_family(family_id, user, db)
    if membership.role not in ("primary_owner", "father"):
        raise HTTPException(
            status_code=403,
            detail="Only the Primary Owner (father) can perform this action",
        )
    return family


# ─── Audit logging ───────────────────────────────────


async def log_audit(
    db: AsyncSession,
    family_id: str,
    actor_user_id: str,
    action: str,
    ar: str,
    en: str,
    metadata: Optional[dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> AuditLog:
    """Append an entry to the audit log."""
    entry = AuditLog(
        family_id=family_id,
        actor_user_id=actor_user_id,
        action=action,
        ar=ar,
        en=en,
        metadata_json=metadata or {},
        ip_address=ip_address,
        user_agent=user_agent,
        at=datetime.utcnow(),
    )
    db.add(entry)
    await db.flush()
    return entry


async def audit_from_request(
    request: Request,
    db: AsyncSession,
    family_id: str,
    actor_user_id: str,
    action: str,
    ar: str,
    en: str,
    metadata: Optional[dict[str, Any]] = None,
) -> AuditLog:
    """Convenience wrapper that pulls IP/UA from the FastAPI request."""
    return await log_audit(
        db=db,
        family_id=family_id,
        actor_user_id=actor_user_id,
        action=action,
        ar=ar,
        en=en,
        metadata=metadata,
        ip_address=getattr(request.state, "ip_address", None),
        user_agent=getattr(request.state, "user_agent", None),
    )
