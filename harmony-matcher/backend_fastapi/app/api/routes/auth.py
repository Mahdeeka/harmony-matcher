from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ...core.jwt import generate_token
from ...core.otp import send_otp, verify_otp
from ...core.phones import phone_lookup_candidates
from ...db import fetch_one, get_conn


router = APIRouter()


class RequestOtpBody(BaseModel):
    method: str = "phone"  # phone|email
    phone: str | None = None
    email: str | None = None
    eventId: str
    rememberDevice: bool | None = None


@router.post("/request-otp")
def request_otp(body: RequestOtpBody):
    conn = get_conn()
    try:
        if body.method == "email":
            if not body.email:
                raise HTTPException(status_code=400, detail={"error": "البريد الإلكتروني مطلوب"})
            attendee = fetch_one(
                conn,
                "SELECT * FROM attendees WHERE email = ? AND event_id = ?",
                (body.email, body.eventId),
            )
            if not attendee:
                raise HTTPException(
                    status_code=404,
                    detail={"error": "لم يتم العثور على البريد الإلكتروني في قائمة المشاركين"},
                )
            # Magic link not implemented (matches Node: log only). Still succeed.
            return {"success": True, "message": "تم إرسال رابط تسجيل الدخول"}

        # phone method (default)
        if not body.phone:
            raise HTTPException(status_code=400, detail={"error": "رقم الهاتف مطلوب"})

        candidates = phone_lookup_candidates(body.phone)
        attendee = None
        for c in candidates:
            attendee = fetch_one(
                conn,
                "SELECT * FROM attendees WHERE phone = ? AND event_id = ?",
                (c, body.eventId),
            )
            if attendee:
                break
        if not attendee:
            raise HTTPException(
                status_code=404,
                detail={"error": "لم يتم العثور على رقم الهاتف في قائمة المشاركين"},
            )

        send_otp(conn, body.phone)
        return {"success": True, "message": "تم إرسال رمز التحقق"}
    finally:
        conn.close()


class VerifyOtpBody(BaseModel):
    method: str = "phone"
    phone: str | None = None
    email: str | None = None
    code: str
    eventId: str
    rememberDevice: bool | None = None


@router.post("/verify-otp")
def verify_otp_route(body: VerifyOtpBody):
    conn = get_conn()
    try:
        attendee = None
        if body.method == "email":
            if not body.email:
                raise HTTPException(status_code=400, detail={"error": "البريد الإلكتروني مطلوب"})
            if not body.code or len(body.code) < 6:
                raise HTTPException(status_code=400, detail={"error": "رمز التحقق غير صالح"})
            attendee = fetch_one(
                conn,
                "SELECT * FROM attendees WHERE email = ? AND event_id = ?",
                (body.email, body.eventId),
            )
            if not attendee:
                raise HTTPException(status_code=404, detail={"error": "لم يتم العثور على المشارك"})
        else:
            if not body.phone:
                raise HTTPException(status_code=400, detail={"error": "رقم الهاتف مطلوب"})
            if not verify_otp(conn, body.phone, body.code):
                raise HTTPException(
                    status_code=400,
                    detail={"error": "رمز التحقق غير صحيح أو منتهي الصلاحية"},
                )

            candidates = phone_lookup_candidates(body.phone)
            for c in candidates:
                attendee = fetch_one(
                    conn,
                    "SELECT * FROM attendees WHERE phone = ? AND event_id = ?",
                    (c, body.eventId),
                )
                if attendee:
                    break
            if not attendee:
                raise HTTPException(status_code=404, detail={"error": "لم يتم العثور على المشارك"})

        token = generate_token({"attendeeId": attendee["id"], "eventId": body.eventId})
        return {
            "success": True,
            "token": token,
            "attendee": {
                "id": attendee["id"],
                "name": attendee.get("name"),
                "phone": attendee.get("phone"),
                "email": attendee.get("email"),
                "photo_url": attendee.get("photo_url"),
            },
        }
    finally:
        conn.close()


