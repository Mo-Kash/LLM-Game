"""Event definitions for the append-only event log."""

from __future__ import annotations
from enum import Enum
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field
import time


class EventType(str, Enum):
    PLAYER_MOVED = "PLAYER_MOVED"
    NPC_SPOKE = "NPC_SPOKE"
    RELATIONSHIP_CHANGED = "RELATIONSHIP_CHANGED"
    OBJECT_TAKEN = "OBJECT_TAKEN"
    OBJECT_DROPPED = "OBJECT_DROPPED"
    LOCATION_STATE_CHANGED = "LOCATION_STATE_CHANGED"
    NPC_STATE_CHANGED = "NPC_STATE_CHANGED"
    PLAYER_FLAG_SET = "PLAYER_FLAG_SET"
    SESSION_START = "SESSION_START"
    SESSION_END = "SESSION_END"
    JOURNAL_ENTRY_CREATED = "JOURNAL_ENTRY_CREATED"
    CLUE_DISCOVERED = "CLUE_DISCOVERED"
    CLUE_LINKED = "CLUE_LINKED"


class Event(BaseModel):
    id: Optional[int] = None  # assigned by SQLite
    turn: int
    event_type: EventType
    payload: Dict[str, Any] = Field(default_factory=dict)
    timestamp: float = Field(default_factory=time.time)


# ── Typed payload helpers ──────────────────────────────────────────────────


class PlayerMovedPayload(BaseModel):
    from_location_id: str
    to_location_id: str


class RelationshipChangedPayload(BaseModel):
    npc_id: str
    target_id: str
    delta: int  # clamped to [-100, 100]


class ObjectTakenPayload(BaseModel):
    object_id: str
    taken_by: str  # "player" or npc_id


class ObjectDroppedPayload(BaseModel):
    object_id: str
    dropped_by: str
    location_id: str


class LocationStateChangedPayload(BaseModel):
    location_id: str
    key: str
    value: Any


class NpcStateChangedPayload(BaseModel):
    npc_id: str
    key: str
    value: Any


class PlayerFlagSetPayload(BaseModel):
    key: str
    value: Any


class JournalEntryCreatedPayload(BaseModel):
    content: str
