from __future__ import annotations

import asyncio
import json
from collections import defaultdict
from typing import Any

from fastapi import WebSocket

from .core.jwt import verify_token
from .core.messaging import mark_messages_as_read, send_message
from .db import fetch_one, get_conn


class ConnectionManager:
    def __init__(self) -> None:
        self._authed_ws: set[WebSocket] = set()
        self._ws_to_user: dict[WebSocket, str] = {}
        self._ws_to_event: dict[WebSocket, str] = {}
        self._user_to_ws: dict[str, WebSocket] = {}
        self._event_to_ws: dict[str, set[WebSocket]] = defaultdict(set)
        self._conversation_to_ws: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()

    async def disconnect(self, ws: WebSocket) -> None:
        user_id = self._ws_to_user.get(ws)
        event_id = self._ws_to_event.get(ws)

        if user_id and self._user_to_ws.get(user_id) is ws:
            del self._user_to_ws[user_id]
        if ws in self._authed_ws:
            self._authed_ws.remove(ws)

        if event_id and ws in self._event_to_ws.get(event_id, set()):
            self._event_to_ws[event_id].discard(ws)

        # Remove from all conversations
        for conv_id, members in list(self._conversation_to_ws.items()):
            if ws in members:
                members.discard(ws)
            if not members:
                self._conversation_to_ws.pop(conv_id, None)

        if user_id and event_id:
            await self.broadcast_event(event_id, {"type": "user_offline", "userId": user_id}, exclude=ws)

        self._ws_to_user.pop(ws, None)
        self._ws_to_event.pop(ws, None)

    async def authenticate(self, ws: WebSocket, token: str) -> bool:
        decoded = verify_token(token)
        if not decoded:
            return False

        user_id = decoded.get("attendeeId")
        event_id = decoded.get("eventId")
        if not user_id or not event_id:
            return False

        self._authed_ws.add(ws)
        self._ws_to_user[ws] = user_id
        self._ws_to_event[ws] = event_id
        self._user_to_ws[user_id] = ws
        self._event_to_ws[event_id].add(ws)

        await self.broadcast_event(event_id, {"type": "user_online", "userId": user_id}, exclude=ws)
        return True

    def is_authed(self, ws: WebSocket) -> bool:
        return ws in self._authed_ws

    def user_id(self, ws: WebSocket) -> str | None:
        return self._ws_to_user.get(ws)

    def event_id(self, ws: WebSocket) -> str | None:
        return self._ws_to_event.get(ws)

    async def send(self, ws: WebSocket, payload: dict[str, Any]) -> None:
        await ws.send_text(json.dumps(payload, ensure_ascii=False))

    async def broadcast_event(self, event_id: str, payload: dict[str, Any], exclude: WebSocket | None = None) -> None:
        for ws in list(self._event_to_ws.get(event_id, set())):
            if exclude is not None and ws is exclude:
                continue
            try:
                await self.send(ws, payload)
            except Exception:
                pass

    async def join_conversation(self, ws: WebSocket, conversation_id: str) -> None:
        self._conversation_to_ws[conversation_id].add(ws)

    async def leave_conversation(self, ws: WebSocket, conversation_id: str) -> None:
        self._conversation_to_ws.get(conversation_id, set()).discard(ws)

    async def broadcast_conversation(
        self,
        conversation_id: str,
        payload: dict[str, Any],
        exclude: WebSocket | None = None,
    ) -> None:
        for ws in list(self._conversation_to_ws.get(conversation_id, set())):
            if exclude is not None and ws is exclude:
                continue
            try:
                await self.send(ws, payload)
            except Exception:
                pass


manager = ConnectionManager()


async def handle_ws_message(ws: WebSocket, msg: dict[str, Any]) -> None:
    msg_type = msg.get("type")

    if msg_type == "auth":
        token = msg.get("token") or ""
        ok = await manager.authenticate(ws, token)
        await manager.send(ws, {"type": "auth_ok" if ok else "auth_error"})
        return

    if not manager.is_authed(ws):
        await manager.send(ws, {"type": "error", "error": "غير مصرح"})
        return

    if msg_type == "join_conversation":
        conv_id = msg.get("conversationId")
        if conv_id:
            await manager.join_conversation(ws, conv_id)
        return

    if msg_type == "leave_conversation":
        conv_id = msg.get("conversationId")
        if conv_id:
            await manager.leave_conversation(ws, conv_id)
        return

    if msg_type in ("start_typing", "stop_typing"):
        conv_id = msg.get("conversationId")
        if not conv_id:
            return
        event_name = "user_typing" if msg_type == "start_typing" else "user_stop_typing"
        await manager.broadcast_conversation(
            conv_id,
            {"type": event_name, "userId": manager.user_id(ws), "conversationId": conv_id},
            exclude=ws,
        )
        return

    if msg_type == "mark_conversation_read":
        conv_id = msg.get("conversationId")
        user_id = manager.user_id(ws)
        if not conv_id or not user_id:
            return
        conn = get_conn()
        try:
            mark_messages_as_read(conn, conv_id, user_id)
        finally:
            conn.close()
        await manager.broadcast_conversation(
            conv_id, {"type": "conversation_read", "conversationId": conv_id, "userId": user_id}, exclude=ws
        )
        return

    if msg_type == "send_message":
        conv_id = msg.get("conversationId")
        content = (msg.get("content") or "").strip()
        message_type = msg.get("messageType") or "text"
        user_id = manager.user_id(ws)
        if not conv_id or not user_id or not content:
            return

        conn = get_conn()
        try:
            saved = send_message(conn, conv_id, user_id, content, message_type)
            sender = fetch_one(conn, "SELECT name, photo_url FROM attendees WHERE id = ?", (user_id,))
        finally:
            conn.close()

        message_data = dict(saved)
        if sender:
            message_data["sender_name"] = sender.get("name")
            message_data["sender_photo"] = sender.get("photo_url")

        await manager.broadcast_conversation(
            conv_id, {"type": "new_message", "conversationId": conv_id, "message": message_data}
        )
        return

    await manager.send(ws, {"type": "error", "error": "unknown_message_type"})


