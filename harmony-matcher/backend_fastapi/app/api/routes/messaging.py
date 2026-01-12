from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel

from ..deps import get_bearer_token, require_jwt_payload
from ...core.messaging import (
    get_conversations_for_user,
    get_messages,
    get_unread_count,
    mark_messages_as_read,
    send_message,
)
from ...db import get_conn


router = APIRouter()


@router.get("/events/{event_id}/conversations")
def conversations(event_id: str, authorization: str | None = Header(default=None)):
    token = get_bearer_token(authorization)
    decoded = require_jwt_payload(token)

    conn = get_conn()
    try:
        convs = get_conversations_for_user(conn, decoded["attendeeId"], event_id)
        return {"conversations": convs}
    finally:
        conn.close()


@router.get("/conversations/{conversation_id}/messages")
def messages(
    conversation_id: str,
    authorization: str | None = Header(default=None),
    limit: int = Query(default=50),
    offset: int = Query(default=0),
):
    token = get_bearer_token(authorization)
    _ = require_jwt_payload(token)

    conn = get_conn()
    try:
        msgs = get_messages(conn, conversation_id, int(limit), int(offset))
        return {"messages": msgs}
    finally:
        conn.close()


class SendMessageBody(BaseModel):
    content: str
    messageType: str | None = "text"


@router.post("/conversations/{conversation_id}/messages")
def send_message_route(conversation_id: str, body: SendMessageBody, authorization: str | None = Header(default=None)):
    token = get_bearer_token(authorization)
    decoded = require_jwt_payload(token)

    content = (body.content or "").strip()
    if not content:
        raise HTTPException(status_code=400, detail={"error": "محتوى الرسالة مطلوب"})

    conn = get_conn()
    try:
        msg = send_message(conn, conversation_id, decoded["attendeeId"], content, body.messageType or "text")
        return {"success": True, "message": msg}
    finally:
        conn.close()


@router.post("/conversations/{conversation_id}/read")
def mark_read(conversation_id: str, authorization: str | None = Header(default=None)):
    token = get_bearer_token(authorization)
    decoded = require_jwt_payload(token)

    conn = get_conn()
    try:
        mark_messages_as_read(conn, conversation_id, decoded["attendeeId"])
        return {"success": True}
    finally:
        conn.close()


@router.get("/events/{event_id}/messages/unread")
def unread_count(event_id: str, authorization: str | None = Header(default=None)):
    token = get_bearer_token(authorization)
    decoded = require_jwt_payload(token)

    conn = get_conn()
    try:
        count = get_unread_count(conn, decoded["attendeeId"], event_id)
        return {"unreadCount": count}
    finally:
        conn.close()


