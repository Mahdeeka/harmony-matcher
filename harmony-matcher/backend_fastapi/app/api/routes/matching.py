from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, HTTPException

from ...core.matching import generate_matches_for_event, generate_more_matches
from ...db import execute, fetch_all, fetch_one, get_conn


router = APIRouter()


@router.post("/events/{event_id}/generate-matches")
def start_matching(event_id: str, background: BackgroundTasks):
    conn = get_conn()
    try:
        execute(conn, "UPDATE events SET matching_status = 'processing' WHERE id = ?", (event_id,))
    finally:
        conn.close()

    def _run():
        c = get_conn()
        try:
            generate_matches_for_event(c, event_id)
            execute(c, "UPDATE events SET matching_status = 'completed' WHERE id = ?", (event_id,))
        except Exception:
            execute(c, "UPDATE events SET matching_status = 'failed' WHERE id = ?", (event_id,))
        finally:
            c.close()

    background.add_task(_run)
    return {"success": True, "message": "بدأت عملية المطابقة"}


@router.get("/events/{event_id}/matching-status")
def matching_status(event_id: str):
    conn = get_conn()
    try:
        event = fetch_one(conn, "SELECT matching_status FROM events WHERE id = ?", (event_id,))
        match_count = fetch_one(
            conn,
            "SELECT COUNT(DISTINCT attendee_id) as count FROM matches WHERE event_id = ?",
            (event_id,),
        )
        total = fetch_one(conn, "SELECT COUNT(*) as count FROM attendees WHERE event_id = ?", (event_id,))
        return {
            "status": (event or {}).get("matching_status") or "pending",
            "processed": (match_count or {}).get("count") or 0,
            "total": (total or {}).get("count") or 0,
        }
    finally:
        conn.close()


@router.get("/attendees/{attendee_id}/matches")
def get_matches(attendee_id: str):
    conn = get_conn()
    try:
        matches = fetch_all(
            conn,
            """
            SELECT
              m.*,
              a.name, a.phone, a.email, a.title, a.company, a.industry,
              a.professional_bio, a.personal_bio, a.photo_url, a.linkedin_url,
              a.skills, a.looking_for, a.offering
            FROM matches m
            JOIN attendees a ON m.matched_attendee_id = a.id
            WHERE m.attendee_id = ?
            ORDER BY m.match_score DESC
            """,
            (attendee_id,),
        )
        return {"matches": matches}
    finally:
        conn.close()


@router.post("/attendees/{attendee_id}/more-matches")
def more_matches(attendee_id: str):
    conn = get_conn()
    try:
        current = fetch_one(
            conn,
            "SELECT MAX(batch_number) as max_batch FROM matches WHERE attendee_id = ?",
            (attendee_id,),
        )
        next_batch = ((current or {}).get("max_batch") or 1) + 1

        generate_more_matches(conn, attendee_id, next_batch)

        new_matches = fetch_all(
            conn,
            """
            SELECT
              m.*,
              a.name, a.phone, a.email, a.title, a.company, a.industry,
              a.professional_bio, a.personal_bio, a.photo_url, a.linkedin_url
            FROM matches m
            JOIN attendees a ON m.matched_attendee_id = a.id
            WHERE m.attendee_id = ? AND m.batch_number = ?
            ORDER BY m.match_score DESC
            """,
            (attendee_id, next_batch),
        )
        return {"matches": new_matches, "batch": next_batch}
    finally:
        conn.close()


