from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from twilio.rest import Client

from ..db import execute, fetch_one
from ..settings import settings
from .phones import format_phone_number


def _twilio_client() -> Client | None:
    if not (settings.twilio_account_sid and settings.twilio_auth_token):
        return None
    return Client(settings.twilio_account_sid, settings.twilio_auth_token)


def generate_otp_code() -> str:
    # Node code uses 4 digits
    return str(random.randint(1000, 9999))


def send_otp(conn, phone: str) -> dict:
    formatted = format_phone_number(phone)
    code = generate_otp_code()
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()

    execute(
        conn,
        "INSERT INTO otp_codes (id, phone, code, expires_at) VALUES (?, ?, ?, ?)",
        (str(uuid4()), formatted, code, expires_at),
    )

    client = _twilio_client()
    if not client or not settings.twilio_phone_number:
        # Dev mode: behave like Node fallback: succeed but include devCode
        return {"success": True, "devCode": code}

    try:
        client.messages.create(
            body=f"رمز التحقق الخاص بك في Harmony Matcher: {code}\nصالح لمدة 10 دقائق",
            from_=settings.twilio_phone_number,
            to=formatted,
        )
        return {"success": True}
    except Exception:
        # Match Node behavior: log + succeed (devCode)
        return {"success": True, "devCode": code}


def verify_otp(conn, phone: str, code: str) -> bool:
    formatted = format_phone_number(phone)
    otp = fetch_one(
        conn,
        "SELECT * FROM otp_codes WHERE phone = ? AND code = ? AND verified = 0 ORDER BY created_at DESC LIMIT 1",
        (formatted, code),
    )
    if not otp:
        return False
    try:
        if datetime.fromisoformat(otp["expires_at"]) < datetime.now(timezone.utc):
            return False
    except Exception:
        return False

    execute(conn, "UPDATE otp_codes SET verified = 1 WHERE id = ?", (otp["id"],))
    return True


