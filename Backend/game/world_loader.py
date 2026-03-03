"""Load and validate the canonical world seed."""

from __future__ import annotations
import json
from pathlib import Path

from schemas.world_state import WorldState


def load_world_seed(path: Path) -> WorldState:
    data = json.loads(path.read_text())
    return WorldState(**data)
