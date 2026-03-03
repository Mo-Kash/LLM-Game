"""Deterministic reducer: applies a stream of events to produce WorldState."""

from __future__ import annotations
import copy
import logging
from typing import List

from schemas.events import Event, EventType
from schemas.world_state import WorldState

log = logging.getLogger(__name__)


def apply_event(state: WorldState, event: Event) -> WorldState:
    """Pure function: returns a new WorldState after applying one event."""
    s = state.model_copy(deep=True)
    p = event.payload
    et = event.event_type

    try:
        if et == EventType.SESSION_START:
            pass  # no mutation

        elif et == EventType.PLAYER_MOVED:
            dest = p.get("to_location_id")
            if dest and dest in s.locations:
                s.player.current_location_id = dest
                s.turn = event.turn
            else:
                log.warning("PLAYER_MOVED: unknown location %s — ignored", dest)

        elif et == EventType.RELATIONSHIP_CHANGED:
            npc_id = p.get("npc_id")
            target_id = p.get("target_id", "player")
            delta = int(p.get("delta", 0))
            if npc_id and npc_id in s.npcs:
                rel = s.relationships.setdefault(npc_id, {})
                current = rel.get(target_id, 0)
                rel[target_id] = max(-100, min(100, current + delta))

        elif et == EventType.OBJECT_TAKEN:
            obj_id = p.get("object_id")
            taken_by = p.get("taken_by", "player")
            if obj_id and obj_id in s.objects:
                obj = s.objects[obj_id]
                obj.location_id = None
                if taken_by == "player":
                    if obj_id not in s.player.inventory:
                        s.player.inventory.append(obj_id)
                else:
                    obj.owner_id = taken_by

        elif et == EventType.OBJECT_DROPPED:
            obj_id = p.get("object_id")
            loc_id = p.get("location_id")
            dropped_by = p.get("dropped_by", "player")
            if obj_id and obj_id in s.objects and loc_id in s.locations:
                obj = s.objects[obj_id]
                obj.location_id = loc_id
                obj.owner_id = None
                if dropped_by == "player" and obj_id in s.player.inventory:
                    s.player.inventory.remove(obj_id)

        elif et == EventType.LOCATION_STATE_CHANGED:
            loc_id = p.get("location_id")
            key = p.get("key")
            value = p.get("value")
            if loc_id and loc_id in s.locations and key:
                s.locations[loc_id].state[key] = value

        elif et == EventType.NPC_STATE_CHANGED:
            npc_id = p.get("npc_id")
            key = p.get("key")
            value = p.get("value")
            if npc_id and npc_id in s.npcs and key:
                if key == "alive":
                    s.npcs[npc_id].alive = bool(value)
                elif key == "location_id" and str(value) in s.locations:
                    s.npcs[npc_id].location_id = str(value)
                else:
                    log.warning(
                        "NPC_STATE_CHANGED: unrecognised key '%s' — ignored", key
                    )

        elif et == EventType.PLAYER_FLAG_SET:
            key = p.get("key")
            value = p.get("value")
            if key:
                s.player.flags[key] = value

        elif et == EventType.NPC_SPOKE:
            pass  # dialogue is ephemeral; no world mutation

        else:
            log.warning("Reducer: unhandled event type %s", et)

    except Exception as exc:
        log.error(
            "Reducer error on event %s: %s — state unchanged for this event",
            event.id,
            exc,
        )

    return s


def rebuild_state(seed: WorldState, events: List[Event]) -> WorldState:
    """Replay all events from seed to current state."""
    state = seed.model_copy(deep=True)
    for event in events:
        state = apply_event(state, event)
    if events:
        state.turn = max(e.turn for e in events)
    return state
