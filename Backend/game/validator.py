"""Validates LLM-proposed world updates against canonical state."""

from __future__ import annotations
import logging
from typing import List, Tuple

from schemas.world_state import WorldState
from schemas.llm_output import LLMOutput, WorldUpdateProposal
from schemas.events import Event, EventType

log = logging.getLogger(__name__)

ALLOWED_EVENT_TYPES = {e.value for e in EventType}


def validate_and_build_events(
    output: LLMOutput,
    world: WorldState,
    turn: int,
) -> Tuple[List[Event], List[str]]:
    """
    Returns (valid_events, error_messages).
    Illegal proposals are dropped; errors are logged but do not halt execution.
    """
    valid: List[Event] = []
    errors: List[str] = []

    # Guard: new_entities must be empty
    if output.new_entities:
        msg = f"LLM attempted entity creation — blocked: {output.new_entities}"
        log.warning(msg)
        errors.append(msg)

    for proposal in output.world_updates:
        err = _validate_proposal(proposal, world)
        if err:
            log.warning("Rejected update (%s): %s", proposal.type, err)
            errors.append(f"Rejected {proposal.type}: {err}")
            continue
        try:
            et = EventType(proposal.type)
        except ValueError:
            errors.append(f"Unknown event type: {proposal.type}")
            continue
        valid.append(Event(turn=turn, event_type=et, payload=proposal.payload))

    return valid, errors


def _validate_proposal(proposal: WorldUpdateProposal, world: WorldState) -> str:
    """Returns error string or empty string if valid."""
    t = proposal.type
    p = proposal.payload

    if t not in ALLOWED_EVENT_TYPES:
        return f"unknown type"

    if t == "PLAYER_MOVED":
        dest = p.get("to_location_id")
        if dest not in world.locations:
            return f"destination '{dest}' not in canonical locations"
        src = world.player.current_location_id
        if dest not in world.locations[src].connected_to:
            return f"'{dest}' not connected to current location '{src}'"

    elif t == "RELATIONSHIP_CHANGED":
        npc_id = p.get("npc_id")
        if npc_id not in world.npcs:
            return f"npc_id '{npc_id}' not canonical"
        delta = p.get("delta", 0)
        if not isinstance(delta, (int, float)) or abs(delta) > 20:
            return f"delta {delta} out of range (max ±20 per turn)"

    elif t == "OBJECT_TAKEN":
        obj_id = p.get("object_id")
        if obj_id not in world.objects:
            return f"object_id '{obj_id}' not canonical"
        obj = world.objects[obj_id]
        if obj.location_id != world.player.current_location_id:
            return f"object '{obj_id}' not in current location"

    elif t == "OBJECT_DROPPED":
        obj_id = p.get("object_id")
        if obj_id not in world.objects:
            return f"object_id '{obj_id}' not canonical"
        if p.get("dropped_by") == "player" and obj_id not in world.player.inventory:
            return f"player does not carry '{obj_id}'"
        loc_id = p.get("location_id")
        if loc_id not in world.locations:
            return f"location '{loc_id}' not canonical"

    elif t == "LOCATION_STATE_CHANGED":
        if p.get("location_id") not in world.locations:
            return f"location '{p.get('location_id')}' not canonical"

    elif t == "NPC_STATE_CHANGED":
        npc_id = p.get("npc_id")
        if npc_id not in world.npcs:
            return f"npc_id '{npc_id}' not canonical"
        allowed_keys = {"alive", "location_id"}
        if p.get("key") not in allowed_keys:
            return f"npc key '{p.get('key')}' not mutable"

    elif t == "PLAYER_FLAG_SET":
        if not p.get("key"):
            return "missing key"

    elif t == "JOURNAL_ENTRY_CREATED":
        if not p.get("content"):
            return "missing content"

    return ""
