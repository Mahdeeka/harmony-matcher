from __future__ import annotations

import shutil
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from ...core.files import parse_attendees_file
from ...core.harmony_import import build_attendees_from_harmony
from ...db import execute, fetch_all, get_conn
from ...settings import settings


router = APIRouter()


@router.get("/events/{event_id}/attendees")
def list_attendees(event_id: str):
    conn = get_conn()
    try:
        attendees = fetch_all(
            conn,
            "SELECT * FROM attendees WHERE event_id = ? ORDER BY name",
            (event_id,),
        )
        return {"attendees": attendees}
    finally:
        conn.close()


class CreateAttendeeBody(BaseModel):
    name: str
    phone: str
    email: str | None = None
    title: str | None = None
    company: str | None = None
    industry: str | None = None
    professional_bio: str | None = None
    personal_bio: str | None = None
    skills: str | None = None
    looking_for: str | None = None
    offering: str | None = None
    linkedin_url: str | None = None
    photo_url: str | None = None
    location: str | None = None
    languages: str | None = None


@router.post("/events/{event_id}/attendees")
def add_attendee(event_id: str, body: CreateAttendeeBody):
    attendee_id = str(uuid4())
    conn = get_conn()
    try:
        execute(
            conn,
            """
            INSERT INTO attendees (
              id, event_id, name, phone, email, title, company, industry,
              professional_bio, personal_bio, skills, looking_for, offering,
              linkedin_url, photo_url, location, languages
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                attendee_id,
                event_id,
                body.name,
                body.phone,
                body.email,
                body.title,
                body.company,
                body.industry,
                body.professional_bio,
                body.personal_bio,
                body.skills,
                body.looking_for,
                body.offering,
                body.linkedin_url,
                body.photo_url,
                body.location,
                body.languages,
            ),
        )
        return {"success": True, "attendee": {"id": attendee_id, **body.model_dump()}}
    finally:
        conn.close()


@router.delete("/attendees/{attendee_id}")
def delete_attendee(attendee_id: str):
    conn = get_conn()
    try:
        execute(conn, "DELETE FROM attendees WHERE id = ?", (attendee_id,))
        return {"success": True}
    finally:
        conn.close()


@router.post("/events/{event_id}/upload")
def upload_attendees(event_id: str, file: UploadFile = File(...)):
    # Save upload under repo-root /uploads (matches Node behavior)
    settings.resolved_uploads_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{int(__import__('time').time() * 1000)}-{file.filename}"
    dest = settings.resolved_uploads_dir / filename

    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        attendees = parse_attendees_file(Path(dest), event_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": f"فشل في استيراد الملف: {e}"})

    conn = get_conn()
    try:
        for a in attendees:
            execute(
                conn,
                """
                INSERT OR REPLACE INTO attendees (
                  id, event_id, name, phone, email, title, company, industry,
                  professional_bio, personal_bio, skills, looking_for, offering,
                  linkedin_url, photo_url, location, languages
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    a.get("id"),
                    event_id,
                    a.get("name"),
                    a.get("phone"),
                    a.get("email"),
                    a.get("title"),
                    a.get("company"),
                    a.get("industry"),
                    a.get("professional_bio"),
                    a.get("personal_bio"),
                    a.get("skills"),
                    a.get("looking_for"),
                    a.get("offering"),
                    a.get("linkedin_url"),
                    a.get("photo_url"),
                    a.get("location"),
                    a.get("languages"),
                ),
            )
        return {
            "success": True,
            "message": f"تم استيراد {len(attendees)} مشارك بنجاح",
            "count": len(attendees),
        }
    finally:
        conn.close()


class ImportHarmonyBody(BaseModel):
    selectedIds: list[int] | None = None


@router.post("/events/{event_id}/import-harmony")
async def import_from_harmony(event_id: str, body: ImportHarmonyBody):
    try:
        attendees = await build_attendees_from_harmony(event_id, body.selectedIds)
    except Exception:
        raise HTTPException(status_code=500, detail={"error": "فشل في الاستيراد من Harmony"})

    conn = get_conn()
    try:
        count = 0
        for a in attendees:
            try:
                execute(
                    conn,
                    """
                    INSERT OR IGNORE INTO attendees (
                      id, event_id, name, phone, email, title, company, industry,
                      professional_bio, personal_bio, skills, looking_for, offering,
                      linkedin_url, photo_url, location, languages, harmony_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        a.get("id"),
                        a.get("event_id"),
                        a.get("name"),
                        a.get("phone"),
                        a.get("email"),
                        a.get("title"),
                        a.get("company"),
                        a.get("industry"),
                        a.get("professional_bio"),
                        a.get("personal_bio"),
                        a.get("skills"),
                        a.get("looking_for"),
                        a.get("offering"),
                        a.get("linkedin_url"),
                        a.get("photo_url"),
                        a.get("location"),
                        a.get("languages"),
                        a.get("harmony_id"),
                    ),
                )
                count += 1
            except Exception:
                pass
        return {"success": True, "message": f"تم استيراد {count} عضو من Harmony", "count": count}
    finally:
        conn.close()


