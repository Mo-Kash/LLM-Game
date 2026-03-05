"""
Pydantic response/request models for the API layer.
These are distinct from the game engine schemas to decouple
the API contract from internal representations.
"""

from __future__ import annotations
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

# ── Requests ──────────────────────────────────────────────────────────────


class CreateSessionRequest(BaseModel):
    name: str
    gender: str
    age: int
    occupation: str
    default_npc_id: str = "gareth_barkeep"
    reset: bool = False


class PlayerActionRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    npc_id: Optional[str] = None  # override active NPC for this action


class SwitchNPCRequest(BaseModel):
    npc_id: str


# ── Responses ─────────────────────────────────────────────────────────────


class SessionInfo(BaseModel):
    session_id: str
    player_name: str
    turn: int
    active_npc_id: str
    current_location_id: str
    created_at: float


class NPCInfo(BaseModel):
    id: str
    name: str
    description: str
    personality: str
    location_id: str
    alive: bool
    trust: int = 0  # relationship to player


class LocationInfo(BaseModel):
    id: str
    name: str
    description: str
    connected_to: List[str]
    npcs_present: List[NPCInfo]
    objects_here: List[ObjectInfo]
    state: Dict[str, Any] = Field(default_factory=dict)


class ObjectInfo(BaseModel):
    id: str
    name: str
    description: str
    location_id: Optional[str] = None
    properties: Dict[str, Any] = Field(default_factory=dict)


class PlayerInfo(BaseModel):
    current_location_id: str
    inventory: List[ObjectInfo]
    flags: Dict[str, Any]


class GameStateResponse(BaseModel):
    session_id: str
    turn: int
    active_npc_id: str
    active_npc: Optional[NPCInfo] = None
    location: Optional[LocationInfo] = None
    player: Optional[PlayerInfo] = None
    relationships: Dict[str, Dict[str, int]] = Field(default_factory=dict)
    journal: List[Dict[str, Any]] = Field(default_factory=list)
    dialogue_history: list = Field(default_factory=list)  # Simplified for UI


class ActionResponse(BaseModel):
    npc_dialogue: str
    narration: str = ""
    npc_id: str
    npc_name: str
    turn: int
    trust_change: int = 0
    validation_errors: List[str] = Field(default_factory=list)
    elapsed_ms: float = 0.0
    events: List[Dict[str, Any]] = Field(default_factory=list)
    error: bool = False


class NPCListResponse(BaseModel):
    npcs: List[NPCInfo]
    active_npc_id: str


class SaveInfo(BaseModel):
    session_id: str
    player_name: str
    location_name: str
    turn: int
    created_at: float
    is_auto: bool = False


class CommandResponse(BaseModel):
    output: str
    command: str
    error: bool = False


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    version: str = "0.1.0"
    llm_reachable: bool = False
    active_sessions: int = 0


class GameMetadataResponse(BaseModel):
    title: str = "LLM Game"
    description: str = ""
    character_options: Dict[str, Any] = Field(default_factory=dict)


# ── WebSocket Messages ────────────────────────────────────────────────────


class WSOutMessage(BaseModel):
    type: str
    payload: Dict[str, Any] = Field(default_factory=dict)
    timestamp: float = 0.0


class WSInMessage(BaseModel):
    type: str  # "action", "command", "ping"
    payload: Dict[str, Any] = Field(default_factory=dict)
