from __future__ import annotations

from uuid import uuid4

from ..db import execute, fetch_all, fetch_one


def create_or_get_conversation(conn, event_id: str, participant1_id: str, participant2_id: str) -> dict:
    p1, p2 = (participant1_id, participant2_id) if participant1_id < participant2_id else (participant2_id, participant1_id)
    conv = fetch_one(
        conn,
        """
        SELECT * FROM conversations
        WHERE event_id = ? AND participant1_id = ? AND participant2_id = ?
        """,
        (event_id, p1, p2),
    )
    if conv:
        return conv

    conv_id = str(uuid4())
    execute(
        conn,
        """
        INSERT INTO conversations (id, event_id, participant1_id, participant2_id)
        VALUES (?, ?, ?, ?)
        """,
        (conv_id, event_id, p1, p2),
    )
    return fetch_one(conn, "SELECT * FROM conversations WHERE id = ?", (conv_id,))


def send_message(conn, conversation_id: str, sender_id: str, content: str, message_type: str = "text") -> dict:
    msg_id = str(uuid4())
    execute(
        conn,
        """
        INSERT INTO messages (id, conversation_id, sender_id, content, message_type)
        VALUES (?, ?, ?, ?, ?)
        """,
        (msg_id, conversation_id, sender_id, content, message_type),
    )

    execute(
        conn,
        """
        UPDATE conversations
        SET last_message = ?, last_message_time = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
        (content, conversation_id),
    )

    conv = fetch_one(conn, "SELECT * FROM conversations WHERE id = ?", (conversation_id,))
    other_field = "unread_count2" if conv["participant1_id"] == sender_id else "unread_count1"
    execute(conn, f"UPDATE conversations SET {other_field} = {other_field} + 1 WHERE id = ?", (conversation_id,))

    return fetch_one(conn, "SELECT * FROM messages WHERE id = ?", (msg_id,))


def get_conversations_for_user(conn, attendee_id: str, event_id: str) -> list[dict]:
    return fetch_all(
        conn,
        """
        SELECT
          c.*,
          CASE WHEN c.participant1_id = ? THEN a2.name ELSE a1.name END as other_participant_name,
          CASE WHEN c.participant1_id = ? THEN a2.photo_url ELSE a1.photo_url END as other_participant_photo,
          CASE WHEN c.participant1_id = ? THEN c.unread_count1 ELSE c.unread_count2 END as unread_count
        FROM conversations c
        JOIN attendees a1 ON c.participant1_id = a1.id
        JOIN attendees a2 ON c.participant2_id = a2.id
        WHERE c.event_id = ? AND (c.participant1_id = ? OR c.participant2_id = ?)
        ORDER BY c.last_message_time DESC
        """,
        (attendee_id, attendee_id, attendee_id, event_id, attendee_id, attendee_id),
    )


def get_messages(conn, conversation_id: str, limit: int = 50, offset: int = 0) -> list[dict]:
    msgs = fetch_all(
        conn,
        """
        SELECT
          m.*,
          a.name as sender_name,
          a.photo_url as sender_photo
        FROM messages m
        JOIN attendees a ON m.sender_id = a.id
        WHERE m.conversation_id = ?
        ORDER BY m.created_at DESC
        LIMIT ? OFFSET ?
        """,
        (conversation_id, limit, offset),
    )
    return list(reversed(msgs))


def mark_messages_as_read(conn, conversation_id: str, user_id: str) -> None:
    execute(
        conn,
        """
        UPDATE messages
        SET is_read = 1
        WHERE conversation_id = ? AND sender_id != ?
        """,
        (conversation_id, user_id),
    )

    conv = fetch_one(conn, "SELECT * FROM conversations WHERE id = ?", (conversation_id,))
    unread_field = "unread_count1" if conv["participant1_id"] == user_id else "unread_count2"
    execute(conn, f"UPDATE conversations SET {unread_field} = 0 WHERE id = ?", (conversation_id,))


def get_unread_count(conn, attendee_id: str, event_id: str) -> int:
    row = fetch_one(
        conn,
        """
        SELECT SUM(unread_count) as total_unread
        FROM (
          SELECT
            CASE WHEN participant1_id = ? THEN unread_count1 ELSE unread_count2 END as unread_count
          FROM conversations
          WHERE event_id = ? AND (participant1_id = ? OR participant2_id = ?)
        )
        """,
        (attendee_id, event_id, attendee_id, attendee_id),
    )
    return int((row or {}).get("total_unread") or 0)


