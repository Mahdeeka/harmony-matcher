from __future__ import annotations

from fastapi import Header, HTTPException

from ..core.jwt import verify_token


def get_bearer_token(authorization: str | None = Header(default=None)) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail={"error": "غير مصرح"})
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail={"error": "غير مصرح"})
    return authorization.split(" ", 1)[1].strip()


def require_jwt_payload(token: str) -> dict:
    decoded = verify_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail={"error": "غير مصرح"})
    return decoded


