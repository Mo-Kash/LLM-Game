"""Append-only SQLite event store."""

from __future__ import annotations
import json
import sqlite3
import logging
from pathlib import Path
from typing import List, Optional

from schemas.events import Event, EventType

log = logging.getLogger(__name__)


class EventStore:
    def __init__(self, db_path: Path):
        self.db_path = db_path
        self._conn: Optional[sqlite3.Connection] = None
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        if self._conn is None:
            self._conn = sqlite3.connect(str(self.db_path), check_same_thread=False)
            self._conn.row_factory = sqlite3.Row
        return self._conn

    def _init_db(self) -> None:
        conn = self._connect()
        conn.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                turn       INTEGER NOT NULL,
                event_type TEXT    NOT NULL,
                payload    TEXT    NOT NULL,
                timestamp  REAL    NOT NULL
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_events_turn ON events(turn)")
        conn.commit()
        log.debug("Event store initialised at %s", self.db_path)

    def append(self, event: Event) -> int:
        """Persist event; returns assigned row id."""
        conn = self._connect()
        cur = conn.execute(
            "INSERT INTO events (turn, event_type, payload, timestamp) VALUES (?, ?, ?, ?)",
            (
                event.turn,
                event.event_type.value,
                json.dumps(event.payload),
                event.timestamp,
            ),
        )
        conn.commit()
        event.id = cur.lastrowid
        log.debug(
            "Appended event id=%d type=%s turn=%d",
            event.id,
            event.event_type,
            event.turn,
        )
        return cur.lastrowid

    def get_last_id(self) -> int:
        """Returns the ID of the most recent event, or 0 if empty."""
        conn = self._connect()
        row = conn.execute("SELECT MAX(id) as max_id FROM events").fetchone()
        return row["max_id"] or 0

    def load_all(self) -> List[Event]:
        """Replay full event log in order."""
        conn = self._connect()
        rows = conn.execute(
            "SELECT id, turn, event_type, payload, timestamp FROM events ORDER BY id"
        ).fetchall()
        events = []
        for row in rows:
            try:
                e = Event(
                    id=row["id"],
                    turn=row["turn"],
                    event_type=EventType(row["event_type"]),
                    payload=json.loads(row["payload"]),
                    timestamp=row["timestamp"],
                )
                events.append(e)
            except Exception as exc:
                log.warning("Skipping corrupt event id=%s: %s", row["id"], exc)
        return events

    def load_from_turn(self, since_turn: int) -> List[Event]:
        conn = self._connect()
        rows = conn.execute(
            "SELECT id, turn, event_type, payload, timestamp FROM events WHERE turn >= ? ORDER BY id",
            (since_turn,),
        ).fetchall()
        return [
            Event(
                id=r["id"],
                turn=r["turn"],
                event_type=EventType(r["event_type"]),
                payload=json.loads(r["payload"]),
                timestamp=r["timestamp"],
            )
            for r in rows
        ]

    def close(self) -> None:
        if self._conn:
            self._conn.close()
            self._conn = None
