"""
MD.Family Backend — Authentication endpoints.

POST /api/v1/auth/register     — email + password registration
POST /api/v1/auth/login         — email + password login
POST /api/v1/auth/google        — Google ID token login
POST /api/v1/auth/refresh       — exchange refresh token for new access token
GET  /api/v1/auth/me             — get current user
POST /api/v1/auth/logout         — invalidate current session (client-side for JWT)
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db
from ...core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    exchange_google_code,
    hash_password,
    verify_google_id_token,
    verify_password,
)
from ..deps import get_current_user
from ...models import User
from ...schemas import (
    GoogleLoginRequest,
    RefreshRequest,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate, request: Request, db: AsyncSession = Depends(get_db)):
    """Register a new parent account (email + password)."""
    # Check email is not already taken
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email=payload.email,
        name=payload.name,
        password_hash=hash_password(payload.password),
        avatar_color="#005C9E",
        avatar_initials=payload.name[0] if payload.name else "?",
        auth_provider="email",
        locale=payload.locale,
        last_login_at=datetime.utcnow(),
    )
    db.add(user)
    await db.flush()
    await db.commit()
    await db.refresh(user)

    access = create_access_token(subject=user.id)
    refresh = create_refresh_token(subject=user.id)
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        expires_in=60 * 60 * 24 * 30,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin, request: Request, db: AsyncSession = Depends(get_db)):
    """Login with email + password."""
    user = (
        await db.execute(select(User).where(User.email == payload.email))
    ).scalar_one_or_none()
    if not user or not user.password_hash or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active or user.is_deleted:
        raise HTTPException(status_code=403, detail="Account is disabled")

    user.last_login_at = datetime.utcnow()
    await db.commit()
    await db.refresh(user)

    access = create_access_token(subject=user.id)
    refresh = create_refresh_token(subject=user.id)
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        expires_in=60 * 60 * 24 * 30,
        user=UserResponse.model_validate(user),
    )


@router.post("/google", response_model=TokenResponse)
async def login_google(payload: GoogleLoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Login or register via Google ID token.

    The client (parent app) sends the ID token returned by Google Sign-In SDK.
    We verify it against Google's tokeninfo endpoint and either:
      - return an existing user (matched by google_sub or email), or
      - create a new user with the verified email
    """
    google_user = await verify_google_id_token(payload.id_token)
    if not google_user:
        raise HTTPException(status_code=401, detail="Invalid Google ID token")

    google_sub = google_user.get("sub")
    email = google_user.get("email")
    name = google_user.get("name") or email.split("@")[0]
    if not email:
        raise HTTPException(status_code=400, detail="Google token missing email scope")

    # Try to find by google_sub first, then by email
    user = (
        await db.execute(select(User).where(User.google_sub == google_sub))
    ).scalar_one_or_none()
    if not user:
        user = (
            await db.execute(select(User).where(User.email == email))
        ).scalar_one_or_none()
        if user:
            # Link Google sub to existing email account
            user.google_sub = google_sub
            user.auth_provider = "google"
        else:
            # Create new account
            user = User(
                email=email,
                name=name,
                google_sub=google_sub,
                password_hash=None,
                avatar_color="#005C9E",
                avatar_initials=name[0] if name else "?",
                auth_provider="google",
                last_login_at=datetime.utcnow(),
            )
            db.add(user)

    user.last_login_at = datetime.utcnow()
    await db.commit()
    await db.refresh(user)

    access = create_access_token(subject=user.id)
    refresh = create_refresh_token(subject=user.id)
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        expires_in=60 * 60 * 24 * 30,
        user=UserResponse.model_validate(user),
    )


@router.post("/google/code", response_model=TokenResponse)
async def login_google_code(code_payload: dict, request: Request, db: AsyncSession = Depends(get_db)):
    """Server-side Google OAuth flow — exchange authorization code for tokens.

    Use this endpoint when the client can't safely hold the Google client secret.
    The client redirects the user to Google's consent screen, then sends the
    returned authorization code to this endpoint.

    Body: {"code": "<oauth-authorization-code>"}
    """
    code = code_payload.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Missing 'code' in body")
    result = await exchange_google_code(code)
    if not result:
        raise HTTPException(status_code=400, detail="Failed to exchange code with Google")

    google_user = result["user"]
    google_sub = google_user.get("sub")
    email = google_user.get("email")
    name = google_user.get("name") or email.split("@")[0]
    if not email or not google_sub:
        raise HTTPException(status_code=400, detail="Google response missing required claims")

    user = (
        await db.execute(select(User).where(User.google_sub == google_sub))
    ).scalar_one_or_none()
    if not user:
        user = User(
            email=email, name=name, google_sub=google_sub,
            password_hash=None, avatar_color="#005C9E",
            avatar_initials=name[0] if name else "?", auth_provider="google",
            last_login_at=datetime.utcnow(),
        )
        db.add(user)
    user.last_login_at = datetime.utcnow()
    await db.commit()
    await db.refresh(user)

    access = create_access_token(subject=user.id)
    refresh = create_refresh_token(subject=user.id)
    return TokenResponse(
        access_token=access, refresh_token=refresh, expires_in=60 * 60 * 24 * 30,
        user=UserResponse.model_validate(user),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Exchange a refresh token for a new access token (and rotated refresh)."""
    decoded = decode_token(payload.refresh_token)
    if not decoded or decoded.get("typ") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user = await db.get(User, decoded.get("sub", ""))
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or disabled")

    access = create_access_token(subject=user.id)
    new_refresh = create_refresh_token(subject=user.id)
    return TokenResponse(
        access_token=access, refresh_token=new_refresh, expires_in=60 * 60 * 24 * 30,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def me(user: User = Depends(get_current_user)):
    """Get the current authenticated user."""
    return UserResponse.model_validate(user)


@router.post("/logout")
async def logout(user: User = Depends(get_current_user)):
    """Logout — for JWT, this is purely client-side (delete the token).
    A production system would maintain a token revocation list in Redis.
    """
    return {"message": "Logged out — discard tokens on the client."}
