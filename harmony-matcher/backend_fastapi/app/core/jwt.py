from __future__ import annotations

from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from ..settings import settings


def generate_token(payload: dict, expires_days: int = 30) -> str:
    to_encode = dict(payload)
    exp = datetime.now(timezone.utc) + timedelta(days=expires_days)
    to_encode["exp"] = exp
    return jwt.encode(to_encode, settings.jwt_secret, algorithm="HS256")


def verify_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except JWTError:
        return None


