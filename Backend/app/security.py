from datetime import datetime, timedelta
from typing import Optional

import bcrypt
from jose import JWTError, jwt
from fastapi import HTTPException, status

from app.config import settings

# ─── Password hashing (direct bcrypt — avoids passlib/bcrypt 4.x conflict) ───
_ENCODING = "utf-8"


def hash_password(plain: str) -> str:
    """Hash a plain-text password with bcrypt."""
    return bcrypt.hashpw(plain.encode(_ENCODING), bcrypt.gensalt()).decode(_ENCODING)


def verify_password(plain: str, hashed: str) -> bool:
    """Return True if the plain password matches the bcrypt hash."""
    return bcrypt.checkpw(plain.encode(_ENCODING), hashed.encode(_ENCODING))


# ─── Token helpers ───────────────────────────────────────────
def _create_token(data: dict, secret: str, expire_delta: timedelta) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + expire_delta
    return jwt.encode(payload, secret, algorithm="HS256")


def create_access_token(user_id: str, email: str) -> str:
    return _create_token(
        {"sub": user_id, "email": email, "type": "access"},
        settings.ACCESS_TOKEN_SECRET,
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def create_refresh_token(user_id: str) -> str:
    return _create_token(
        {"sub": user_id, "type": "refresh"},
        settings.REFRESH_TOKEN_SECRET,
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )


def decode_access_token(token: str) -> dict:
    """Raises HTTP 401 if token is invalid or expired."""
    try:
        payload = jwt.decode(token, settings.ACCESS_TOKEN_SECRET, algorithms=["HS256"])
        if payload.get("type") != "access":
            raise JWTError("wrong token type")
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def decode_refresh_token(token: str) -> dict:
    """Raises HTTP 401 if refresh token is invalid or expired."""
    try:
        payload = jwt.decode(token, settings.REFRESH_TOKEN_SECRET, algorithms=["HS256"])
        if payload.get("type") != "refresh":
            raise JWTError("wrong token type")
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
