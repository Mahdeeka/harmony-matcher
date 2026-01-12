from __future__ import annotations

import re
from uuid import uuid4

import httpx

from ..settings import settings


def extract_skills(member: dict) -> str | None:
    acf = member.get("acf") or {}
    skills: list[str] = []
    selected = acf.get("selected_skills")
    if isinstance(selected, list):
        skills.extend([s for s in selected if s])
    new_skills = acf.get("new_skills")
    if new_skills:
        skills.append(str(new_skills))
    return ", ".join(skills) if skills else None


def extract_company(member: dict) -> str | None:
    acf = member.get("acf") or {}
    resume = acf.get("pro_resume")
    if not resume:
        return None
    text = str(resume)
    # Very light heuristic, ported from backend/services/harmony.js
    m = re.findall(r'["“”](\w+\s+\w+)["“”]', text)
    if m:
        return m[0].strip()
    m2 = re.findall(r"شركة\s+([^،\n\r]+)", text)
    if m2:
        return m2[0].strip()
    m3 = re.findall(r"في\s+([^،\n\r]+)", text)
    if m3:
        return m3[0].strip()
    return None


def extract_industry(member: dict) -> str | None:
    acf = member.get("acf") or {}
    title = (acf.get("job_title") or "").lower()
    if not title:
        return None
    if any(k in title for k in ("مطور", "برمجة", "تطوير")):
        return "تكنولوجيا المعلومات"
    if any(k in title for k in ("محاسب", "مالي")):
        return "المالية والمحاسبة"
    if "تسويق" in title or "marketing" in title:
        return "التسويق"
    if any(k in title for k in ("إدارة", "مدير")):
        return "الإدارة"
    if any(k in title for k in ("مدرس", "تعليم")):
        return "التعليم"
    if any(k in title for k in ("طبي", "دكتور")):
        return "الرعاية الصحية"
    if any(k in title for k in ("محامي", "قانون")):
        return "القانون"
    return None


async def fetch_harmony_members() -> dict:
    if not settings.harmony_api_url:
        raise RuntimeError("HARMONY_API_URL is not configured")
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(settings.harmony_api_url)
        resp.raise_for_status()
        return resp.json()


async def build_attendees_from_harmony(event_id: str, selected_ids: list[int] | None = None) -> list[dict]:
    data = await fetch_harmony_members()
    members = data.get("items") or []
    if selected_ids:
        members = [m for idx, m in enumerate(members) if idx in set(selected_ids)]

    attendees: list[dict] = []
    for member in members:
        acf = member.get("acf") or {}
        attendees.append(
            {
                "id": str(uuid4()),
                "event_id": event_id,
                "name": (acf.get("full_name") or member.get("title") or "").strip(),
                "phone": (acf.get("phone") or "").strip(),
                "email": (acf.get("email") or "").strip(),
                "title": (acf.get("job_title") or "").strip(),
                "company": (extract_company(member) or "").strip(),
                "industry": (extract_industry(member) or "").strip(),
                "professional_bio": (acf.get("pro_resume") or "").strip(),
                "personal_bio": (acf.get("personal_resume") or "").strip(),
                "skills": (extract_skills(member) or "").strip(),
                "looking_for": (acf.get("connect_with") or "").strip(),
                "offering": (acf.get("motivation") or "").strip(),
                "linkedin_url": (acf.get("linkedin") or "").strip(),
                "photo_url": (member.get("thumbnail_url") or "").strip(),
                "location": (acf.get("current_country") or "").strip(),
                "languages": "",
                "harmony_id": str(member.get("id") or ""),
            }
        )
    return attendees


