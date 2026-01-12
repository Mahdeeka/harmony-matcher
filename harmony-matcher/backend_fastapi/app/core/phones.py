from __future__ import annotations

import re


def format_phone_number(phone: str) -> str:
    """
    Port of `backend/services/sms.js` `formatPhoneNumber`.
    Canonicalizes Israel numbers to +972... when possible.
    """
    cleaned = re.sub(r"\D", "", phone or "")
    if cleaned.startswith("972"):
        return f"+{cleaned}"
    if cleaned.startswith("0"):
        return f"+972{cleaned[1:]}"
    if len(cleaned) == 9:
        return f"+972{cleaned}"
    return phone if (phone or "").startswith("+") else f"+{cleaned}"


def phone_lookup_candidates(phone: str) -> list[str]:
    """
    Best-effort candidates for attendee lookup, since existing data may contain
    either local (05...) or E.164 (+972...) formats.
    """
    raw = (phone or "").strip()
    digits = re.sub(r"\D", "", raw)
    candidates = {raw, digits}
    if digits:
        candidates.add(f"+{digits}")
    try:
        candidates.add(format_phone_number(raw))
    except Exception:
        pass
    return [c for c in candidates if c]


