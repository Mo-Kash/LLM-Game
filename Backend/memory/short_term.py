"""In-memory ring buffer of recent turns for prompt injection."""

from __future__ import annotations
from collections import deque
from dataclasses import dataclass, field
from typing import Deque, List


@dataclass
class TurnRecord:
    turn: int
    player_input: str
    npc_response: str
    npc_id: str


class ShortTermMemory:
    def __init__(self, max_turns: int = 8):
        self.max_turns = max_turns
        self._buffer: Deque[TurnRecord] = deque(maxlen=max_turns)

    def record(
        self, turn: int, player_input: str, npc_response: str, npc_id: str
    ) -> None:
        self._buffer.append(TurnRecord(turn, player_input, npc_response, npc_id))

    def get_recent(self) -> List[TurnRecord]:
        return list(self._buffer)

    def format_for_prompt(self) -> str:
        if not self._buffer:
            return "(no prior dialogue this session)"
        lines = []
        for r in self._buffer:
            lines.append(f"[Turn {r.turn}] Player: {r.player_input}")
            lines.append(f"[Turn {r.turn}] {r.npc_id}: {r.npc_response}")
        return "\n".join(lines)

    def clear(self) -> None:
        self._buffer.clear()
