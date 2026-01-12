from __future__ import annotations

import json
import re
import time
from uuid import uuid4

from anthropic import Anthropic

from ..db import execute, fetch_all, fetch_one
from ..settings import settings


SYSTEM_PROMPT = """أنت خبير في بناء العلاقات المهنية والتواصل الشبكي لمجتمع Harmony Community - منصة للمحترفين العرب.

مهمتك المتقدمة: تحليل ملفات المشاركين واقتراح أفضل 5 تطابقات باستخدام خوارزمية ذكية تشمل:

1. المهارات المتكاملة (شخص يقدم ما يبحث عنه الآخر)
2. التآزر في الصناعة (إمكانية التعاون المهني)
3. المستوى الوظيفي المتشابه
4. فرص الإرشاد (ربط الخبراء بالمبتدئين)
5. الاهتمامات المشتركة والقيم المشتركة
6. التوافق الثقافي والجغرافي
7. إمكانية الشراكة التجارية

معايير التقييم المتقدم:
- تحليل الخبرة: مقارنة المستويات الوظيفية وسنوات الخبرة
- تحليل المهارات: تطابق المهارات المطلوبة مع المعروضة
- تحليل الصناعة: تقييم إمكانية التعاون بين الصناعات المختلفة
- تحليل الشخصية: استنتاج من النبذة الشخصية
- تحليل التواصل: تقييم أسلوب التواصل من الملف الشخصي

أجب بصيغة JSON فقط."""


def _anthropic() -> Anthropic | None:
    if not settings.anthropic_api_key:
        return None
    return Anthropic(api_key=settings.anthropic_api_key)


def format_profile(a: dict) -> str:
    parts = [f"معرف: {a.get('id')}", f"الاسم: {a.get('name')}"]
    if a.get("title"):
        parts.append(f"المسمى: {a.get('title')}")
    if a.get("company"):
        parts.append(f"الشركة: {a.get('company')}")
    if a.get("industry"):
        parts.append(f"المجال: {a.get('industry')}")
    if a.get("professional_bio"):
        parts.append(f"نبذة مهنية: {a.get('professional_bio')}")
    if a.get("personal_bio"):
        parts.append(f"نبذة شخصية: {a.get('personal_bio')}")
    if a.get("skills"):
        parts.append(f"المهارات: {a.get('skills')}")
    if a.get("looking_for"):
        parts.append(f"يبحث عن: {a.get('looking_for')}")
    if a.get("offering"):
        parts.append(f"يقدم: {a.get('offering')}")
    if a.get("location"):
        parts.append(f"الموقع: {a.get('location')}")
    if a.get("languages"):
        parts.append(f"اللغات: {a.get('languages')}")
    return "\n".join(parts)


def get_experience_level(title: str) -> int:
    t = (title or "").lower()
    if any(k in t for k in ("مدير", "رئيس", "مؤسس")):
        return 5
    if "رئيس قسم" in t or "team lead" in t:
        return 4
    if "مطور رئيسي" in t or "senior" in t:
        return 3
    if any(k in t for k in ("مطور", "مصمم", "محلل")):
        return 2
    return 1


def calculate_compatibility_score(attendee: dict, potential: dict) -> int:
    score = 0
    factors = 0

    if attendee.get("skills") and potential.get("offering"):
        a_skills = str(attendee["skills"]).lower()
        p_offering = str(potential["offering"]).lower()
        if a_skills in p_offering or p_offering in a_skills:
            score += 40
        factors += 1

    if attendee.get("industry") and potential.get("industry"):
        if attendee["industry"] == potential["industry"]:
            score += 25
        elif "تطوير" in str(attendee["industry"]) and "تصميم" in str(potential["industry"]):
            score += 15

    if attendee.get("location") and potential.get("location"):
        if attendee["location"] == potential["location"]:
            score += 15
        elif "تل أبيب" in str(attendee["location"]) and "القدس" in str(potential["location"]):
            score += 10

    if attendee.get("title") and potential.get("title"):
        a_level = get_experience_level(str(attendee["title"]))
        p_level = get_experience_level(str(potential["title"]))
        if abs(a_level - p_level) <= 1:
            score += 20
        elif (
            a_level > p_level and "إرشاد" in str(attendee.get("offering") or "")
        ) or (
            p_level > a_level and "إرشاد" in str(potential.get("offering") or "")
        ):
            score += 15

    return round(score / factors) if factors > 0 else 0


def _ai_matches(attendee: dict, top_candidates: list[dict]) -> list[dict]:
    client = _anthropic()
    if not client:
        return []

    prompt = (
        "المشارك الرئيسي:\n"
        f"{format_profile(attendee)}\n\n---\n"
        "المرشحون المحتملون (مرتبون حسب التوافق الأساسي):\n"
        + "\n---\n".join(
            [
                f"المرتبة {i+1} (توافق أساسي: {c.get('compatibilityScore')}%):\n{format_profile(c)}"
                for i, c in enumerate(top_candidates)
            ]
        )
        + "\n\n---\n"
        "اقترح أفضل 5 تطابقات من المرشحين أعلاه. لكل تطابق قدم:\n"
        "- id: معرف المشارك\n"
        "- score: نسبة التطابق النهائية (دمج التوافق الأساسي مع التحليل الذكي)\n"
        "- type: نوع (complementary/collaborative/mentorship/mentee/serendipity)\n"
        "- reasoning: السبب التفصيلي (2-3 جمل بالعربية)\n"
        "- conversation_starters: نقاط للنقاش (3-4 مواضيع محددة)\n"
        "- synergy_factors: العوامل المساهمة في التطابق\n\n"
        'أجب بـ JSON فقط:\n{"matches": [{"id": "...", "score": 85, "type": "complementary", "reasoning": "...", "conversation_starters": ["...", "..."], "synergy_factors": ["مهارات متكاملة"]}]}'
    )

    resp = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2500,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )
    text = resp.content[0].text if resp.content else ""
    m = re.search(r"\{[\s\S]*\}", text)
    if not m:
        return []
    data = json.loads(m.group(0))
    return data.get("matches") or []


def _fallback_matches(scored: list[dict]) -> list[dict]:
    top = scored[:5]
    return [
        {
            "id": c["id"],
            "score": c["compatibilityScore"],
            "type": "compatibility",
            "reasoning": f"تطابق مبني على التوافق الأساسي ({c['compatibilityScore']}%)",
            "conversation_starters": ["المشاريع الحالية", "الخبرات المهنية", "الأهداف المستقبلية"],
        }
        for c in top
    ]


def get_matches_for_attendee(attendee: dict, all_attendees: list[dict], exclude_ids: list[str] | None = None) -> list[dict]:
    exclude = set(exclude_ids or [])
    potential = [a for a in all_attendees if a["id"] != attendee["id"] and a["id"] not in exclude]
    if not potential:
        return []

    scored = []
    for p in potential:
        scored.append({**p, "compatibilityScore": calculate_compatibility_score(attendee, p)})
    scored.sort(key=lambda x: x["compatibilityScore"], reverse=True)
    top_candidates = scored[:10]

    try:
        ai = _ai_matches(attendee, top_candidates)
        enriched = []
        for match in ai:
            candidate = next((c for c in top_candidates if c["id"] == match.get("id")), None)
            base = candidate["compatibilityScore"] if candidate else 0
            final_score = round((float(match.get("score", 0)) * 0.7) + (base * 0.3))
            enriched.append({**match, "score": min(final_score, 100), "compatibility_score": base})
        return enriched[:5]
    except Exception:
        return _fallback_matches(scored)


def generate_matches_for_event(conn, event_id: str) -> None:
    attendees = fetch_all(conn, "SELECT * FROM attendees WHERE event_id = ?", (event_id,))
    if len(attendees) < 2:
        return

    execute(conn, "DELETE FROM matches WHERE event_id = ?", (event_id,))

    for attendee in attendees:
        matches = get_matches_for_attendee(attendee, attendees)
        for match in matches:
            matched = next((a for a in attendees if a["id"] == match.get("id")), None)
            if not matched:
                continue
            execute(
                conn,
                """
                INSERT INTO matches (
                  id, event_id, attendee_id, matched_attendee_id,
                  match_score, match_type, reasoning_ar, conversation_starters, batch_number
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    str(uuid4()),
                    event_id,
                    attendee["id"],
                    match.get("id"),
                    match.get("score"),
                    match.get("type"),
                    match.get("reasoning"),
                    json.dumps(match.get("conversation_starters") or [], ensure_ascii=False),
                    1,
                ),
            )
        time.sleep(0.5)

    execute(
        conn,
        """
        UPDATE matches
        SET is_mutual = 1
        WHERE event_id = ?
          AND EXISTS (
            SELECT 1 FROM matches m2
            WHERE m2.attendee_id = matches.matched_attendee_id
              AND m2.matched_attendee_id = matches.attendee_id
              AND m2.event_id = matches.event_id
          )
        """,
        (event_id,),
    )


def generate_more_matches(conn, attendee_id: str, batch_number: int) -> None:
    attendee = fetch_one(conn, "SELECT * FROM attendees WHERE id = ?", (attendee_id,))
    if not attendee:
        return
    all_attendees = fetch_all(conn, "SELECT * FROM attendees WHERE event_id = ?", (attendee["event_id"],))
    existing = fetch_all(conn, "SELECT matched_attendee_id FROM matches WHERE attendee_id = ?", (attendee_id,))
    exclude_ids = [m["matched_attendee_id"] for m in existing]

    matches = get_matches_for_attendee(attendee, all_attendees, exclude_ids)
    for match in matches:
        if not any(a["id"] == match.get("id") for a in all_attendees):
            continue
        execute(
            conn,
            """
            INSERT INTO matches (
              id, event_id, attendee_id, matched_attendee_id,
              match_score, match_type, reasoning_ar, conversation_starters, batch_number
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                str(uuid4()),
                attendee["event_id"],
                attendee_id,
                match.get("id"),
                match.get("score"),
                match.get("type"),
                match.get("reasoning"),
                json.dumps(match.get("conversation_starters") or [], ensure_ascii=False),
                batch_number,
            ),
        )

    execute(
        conn,
        """
        UPDATE matches
        SET is_mutual = 1
        WHERE event_id = ?
          AND EXISTS (
            SELECT 1 FROM matches m2
            WHERE m2.attendee_id = matches.matched_attendee_id
              AND m2.matched_attendee_id = matches.attendee_id
              AND m2.event_id = matches.event_id
          )
        """,
        (attendee["event_id"],),
    )


