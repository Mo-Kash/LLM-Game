"""Schema for the single structured LLM output per turn."""

from __future__ import annotations
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class WorldUpdateProposal(BaseModel):
    """A single proposed world mutation from the LLM."""

    type: str  # must match EventType enum values
    payload: Dict[str, Any] = Field(default_factory=dict)


class LLMOutput(BaseModel):
    world_updates: List[WorldUpdateProposal] = Field(default_factory=list)
    memory_summary: str = ""  # persisted to FAISS
    new_entities: List[Dict[str, Any]] = Field(
        default_factory=list
    )  # must be empty / guarded
    rule_flags: List[str] = Field(default_factory=list)
    narration: str = ""  # physical actions, setting descriptions, and observations
    npc_response: str = ""  # streamed to client
    speaker_id: Optional[str] = None  # who is responding
