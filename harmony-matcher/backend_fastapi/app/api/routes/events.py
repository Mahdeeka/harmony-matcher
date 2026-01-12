from __future__ import annotations

from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ...db import execute, fetch_all, fetch_one, get_conn


router = APIRouter()


class CreateEventBody(BaseModel):
    name: str
    name_ar: str
    description: str | None = ""
    date: str | None = None
    location: str | None = None


@router.post("")
def create_event(body: CreateEventBody):
    if not body.name or not body.name_ar:
        raise HTTPException(status_code=400, detail={"error": "اسم الفعالية مطلوب"})

    event_id = str(uuid4())
    conn = get_conn()
    try:
        execute(
            conn,
            """
            INSERT INTO events (id, name, name_ar, description, date, location)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (event_id, body.name, body.name_ar, body.description or "", body.date, body.location),
        )
        return {
            "success": True,
            "event": {
                "id": event_id,
                "name": body.name,
                "name_ar": body.name_ar,
                "description": body.description or "",
                "date": body.date,
                "location": body.location,
            },
        }
    finally:
        conn.close()


@router.get("")
def list_events():
    conn = get_conn()
    try:
        events = fetch_all(
            conn,
            """
            SELECT e.*,
              (SELECT COUNT(*) FROM attendees WHERE event_id = e.id) as attendee_count
            FROM events e
            ORDER BY created_at DESC
            """,
        )
        return {"events": events}
    finally:
        conn.close()


@router.get("/{event_id}")
def get_event(event_id: str):
    conn = get_conn()
    try:
        event = fetch_one(
            conn,
            """
            SELECT e.*,
              (SELECT COUNT(*) FROM attendees WHERE event_id = e.id) as attendee_count
            FROM events e
            WHERE e.id = ?
            """,
            (event_id,),
        )
        if not event:
            raise HTTPException(status_code=404, detail={"error": "الحدث غير موجود"})
        return {"event": event}
    finally:
        conn.close()


@router.delete("/{event_id}")
def delete_event(event_id: str):
    conn = get_conn()
    try:
        execute(conn, "DELETE FROM events WHERE id = ?", (event_id,))
        return {"success": True}
    finally:
        conn.close()


