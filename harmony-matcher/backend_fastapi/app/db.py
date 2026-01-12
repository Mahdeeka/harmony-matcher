from __future__ import annotations

import sqlite3
from collections.abc import Iterable
from pathlib import Path
from typing import Any

from .settings import settings


def _connect(db_path: Path) -> sqlite3.Connection:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    # Reasonable defaults for a small app
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    return conn


def init_db() -> None:
    """
    Ensure tables exist. This mirrors the schema created in `backend/database.js`.
    """
    conn = _connect(settings.resolved_db_path)
    try:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS events (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              name_ar TEXT,
              description TEXT,
              date TEXT,
              location TEXT,
              created_by TEXT,
              matching_status TEXT DEFAULT 'pending',
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS attendees (
              id TEXT PRIMARY KEY,
              event_id TEXT NOT NULL,
              name TEXT NOT NULL,
              phone TEXT NOT NULL,
              email TEXT,
              title TEXT,
              company TEXT,
              industry TEXT,
              professional_bio TEXT,
              personal_bio TEXT,
              skills TEXT,
              looking_for TEXT,
              offering TEXT,
              linkedin_url TEXT,
              photo_url TEXT,
              location TEXT,
              languages TEXT,
              harmony_id TEXT,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
              UNIQUE(event_id, phone)
            );

            CREATE TABLE IF NOT EXISTS matches (
              id TEXT PRIMARY KEY,
              event_id TEXT NOT NULL,
              attendee_id TEXT NOT NULL,
              matched_attendee_id TEXT NOT NULL,
              match_score REAL,
              match_type TEXT,
              reasoning TEXT,
              reasoning_ar TEXT,
              conversation_starters TEXT,
              batch_number INTEGER DEFAULT 1,
              is_mutual INTEGER DEFAULT 0,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
              FOREIGN KEY (attendee_id) REFERENCES attendees(id) ON DELETE CASCADE,
              FOREIGN KEY (matched_attendee_id) REFERENCES attendees(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS otp_codes (
              id TEXT PRIMARY KEY,
              phone TEXT NOT NULL,
              code TEXT NOT NULL,
              expires_at TEXT NOT NULL,
              verified INTEGER DEFAULT 0,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS conversations (
              id TEXT PRIMARY KEY,
              event_id TEXT NOT NULL,
              participant1_id TEXT NOT NULL,
              participant2_id TEXT NOT NULL,
              last_message TEXT,
              last_message_time TEXT,
              unread_count1 INTEGER DEFAULT 0,
              unread_count2 INTEGER DEFAULT 0,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
              FOREIGN KEY (participant1_id) REFERENCES attendees(id) ON DELETE CASCADE,
              FOREIGN KEY (participant2_id) REFERENCES attendees(id) ON DELETE CASCADE,
              UNIQUE(event_id, participant1_id, participant2_id)
            );

            CREATE TABLE IF NOT EXISTS messages (
              id TEXT PRIMARY KEY,
              conversation_id TEXT NOT NULL,
              sender_id TEXT NOT NULL,
              content TEXT NOT NULL,
              message_type TEXT DEFAULT 'text',
              is_read INTEGER DEFAULT 0,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
              FOREIGN KEY (sender_id) REFERENCES attendees(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS admins (
              id TEXT PRIMARY KEY,
              email TEXT UNIQUE NOT NULL,
              password_hash TEXT NOT NULL,
              name TEXT,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            """
        )

        # Indexes (ignore failures if already exist)
        for stmt in (
            "CREATE INDEX IF NOT EXISTS idx_attendees_event ON attendees(event_id);",
            "CREATE INDEX IF NOT EXISTS idx_attendees_phone ON attendees(phone);",
            "CREATE INDEX IF NOT EXISTS idx_matches_attendee ON matches(attendee_id);",
            "CREATE INDEX IF NOT EXISTS idx_matches_event ON matches(event_id);",
            "CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone);",
        ):
            conn.execute(stmt)

        conn.commit()
    finally:
        conn.close()


def get_conn() -> sqlite3.Connection:
    return _connect(settings.resolved_db_path)


def execute(conn: sqlite3.Connection, sql: str, params: Iterable[Any] = ()) -> None:
    conn.execute(sql, tuple(params))
    conn.commit()


def fetch_one(conn: sqlite3.Connection, sql: str, params: Iterable[Any] = ()) -> dict[str, Any] | None:
    row = conn.execute(sql, tuple(params)).fetchone()
    return dict(row) if row else None


def fetch_all(conn: sqlite3.Connection, sql: str, params: Iterable[Any] = ()) -> list[dict[str, Any]]:
    rows = conn.execute(sql, tuple(params)).fetchall()
    return [dict(r) for r in rows]


