"""Snapshot cache — persists WorldState to avoid full replay on startup."""

from __future__ import annotations
import json
import logging
from pathlib import Path
from typing import Optional, Tuple

from schemas.world_state import WorldState

log = logging.getLogger(__name__)


def save_snapshot(state: WorldState, path: Path, last_event_id: int) -> None:
    data = {
        "last_event_id": last_event_id,
        "world_state": state.model_dump(),
    }
    path.write_text(json.dumps(data, indent=2))
    log.debug("Snapshot saved (turn=%d, last_event_id=%d)", state.turn, last_event_id)


def load_snapshot(path: Path) -> Optional[Tuple[WorldState, int]]:
    """Returns (WorldState, last_event_id) or None if not found / invalid."""
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text())
        state = WorldState(**data["world_state"])
        last_event_id = int(data["last_event_id"])
        log.debug(
            "Snapshot loaded (turn=%d, last_event_id=%d)", state.turn, last_event_id
        )
        return state, last_event_id
    except Exception as exc:
        log.warning("Snapshot corrupt, ignoring: %s", exc)
        return None
