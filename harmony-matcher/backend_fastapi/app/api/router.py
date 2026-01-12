from __future__ import annotations

from fastapi import APIRouter

from .routes import attendees, auth, events, harmony, matching, messaging

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(events.router, prefix="/events", tags=["events"])
api_router.include_router(attendees.router, tags=["attendees"])
api_router.include_router(harmony.router, prefix="/harmony", tags=["harmony"])
api_router.include_router(matching.router, tags=["matching"])
api_router.include_router(messaging.router, tags=["messaging"])


@api_router.get("/health")
def health():
    return {"status": "ok"}


