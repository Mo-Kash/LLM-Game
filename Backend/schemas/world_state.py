"""Canonical world-state schemas (Pydantic v2)."""

from __future__ import annotations
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class Location(BaseModel):
    id: str
    name: str
    description: str
    connected_to: List[str] = Field(default_factory=list)
    state: Dict[str, Any] = Field(default_factory=dict)


class NPC(BaseModel):
    id: str
    name: str
    location_id: str
    description: str
    personality: str
    knowledge: List[str] = Field(default_factory=list)  # canonical facts this NPC knows
    secrets: List[str] = Field(
        default_factory=list
    )  # facts only revealed conditionally
    alive: bool = True


class WorldObject(BaseModel):
    id: str
    name: str
    description: str
    location_id: Optional[str] = None  # None = carried by player
    owner_id: Optional[str] = None
    properties: Dict[str, Any] = Field(default_factory=dict)


class PlayerState(BaseModel):
    name: str = "Unknown"
    gender: str = "Unknown"
    age: int = 30
    occupation: str = "Wanderer"
    current_location_id: str
    inventory: List[str] = Field(default_factory=list)  # object ids
    flags: Dict[str, Any] = Field(default_factory=dict)


class JournalEntry(BaseModel):
    id: str
    turn: int
    content: str
    timestamp: float


class WorldState(BaseModel):
    locations: Dict[str, Location] = Field(default_factory=dict)
    npcs: Dict[str, NPC] = Field(default_factory=dict)
    objects: Dict[str, WorldObject] = Field(default_factory=dict)
    rules: List[str] = Field(default_factory=list)
    player: PlayerState
    relationships: Dict[str, Dict[str, int]] = Field(default_factory=dict)
    # relationships[npc_id][entity_id] = trust delta (-100..100)
    journal: List[JournalEntry] = Field(default_factory=list)
    active_npc_id: str = ""
    turn: int = 0
