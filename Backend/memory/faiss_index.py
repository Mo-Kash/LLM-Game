"""FAISS CPU index for long-term semantic memory."""

from __future__ import annotations
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np

import config

log = logging.getLogger(__name__)


class MemoryEntry:
    __slots__ = ("idx", "text", "location_id", "npc_id", "turn", "tags")

    def __init__(
        self,
        idx: int,
        text: str,
        location_id: str = "",
        npc_id: str = "",
        turn: int = 0,
        tags: Optional[List[str]] = None,
    ):
        self.idx = idx
        self.text = text
        self.location_id = location_id
        self.npc_id = npc_id
        self.turn = turn
        self.tags = tags or []


class FAISSMemory:
    def __init__(self, index_path: Path, meta_path: Path, dim: int = 384):
        import faiss

        self.dim = dim
        self.index_path = index_path
        self.meta_path = meta_path
        self._entries: List[MemoryEntry] = []

        if index_path.exists() and meta_path.exists():
            self._index = faiss.read_index(str(index_path))
            meta = json.loads(meta_path.read_text())
            self._entries = [
                MemoryEntry(
                    idx=m["idx"],
                    text=m["text"],
                    location_id=m.get("location_id", ""),
                    npc_id=m.get("npc_id", ""),
                    turn=m.get("turn", 0),
                    tags=m.get("tags", []),
                )
                for m in meta
            ]
            log.info("FAISS index loaded: %d entries", len(self._entries))
        else:
            self._index = faiss.IndexFlatIP(
                dim
            )  # inner product on normalised vecs = cosine
            log.info("FAISS index created (empty).")

    def add(
        self,
        vec: np.ndarray,
        text: str,
        location_id: str = "",
        npc_id: str = "",
        turn: int = 0,
        tags: Optional[List[str]] = None,
    ) -> None:
        import faiss

        v = vec.reshape(1, -1).astype(np.float32)
        faiss.normalize_L2(v)
        idx = len(self._entries)
        self._index.add(v)
        self._entries.append(
            MemoryEntry(idx, text, location_id, npc_id, turn, tags or [])
        )

    def search(
        self,
        vec: np.ndarray,
        top_k: int = 5,
        filter_location: str = "",
        filter_npc: str = "",
    ) -> List[MemoryEntry]:
        import faiss

        if len(self._entries) == 0:
            return []
        v = vec.reshape(1, -1).astype(np.float32)
        faiss.normalize_L2(v)
        k = min(
            top_k * config.FAISS_OVERFETCH_FACTOR, len(self._entries)
        )  # over-fetch for post-filter
        distances, indices = self._index.search(v, k)
        results = []
        for idx in indices[0]:
            if idx < 0 or idx >= len(self._entries):
                continue
            entry = self._entries[idx]
            if (
                filter_location
                and entry.location_id
                and entry.location_id != filter_location
            ):
                continue
            if filter_npc and entry.npc_id and entry.npc_id != filter_npc:
                continue
            results.append(entry)
            if len(results) >= top_k:
                break
        return results

    def prune_oldest(self, keep: int) -> None:
        """Rebuild index keeping only the most recent `keep` entries."""
        import faiss

        if len(self._entries) <= keep:
            return
        log.info("Pruning FAISS memory: %d -> %d entries", len(self._entries), keep)
        keep_entries = self._entries[-keep:]
        texts = [e.text for e in keep_entries]
        # Re-embed is expensive; we reconstruct from stored vecs
        # Since IndexFlatIP supports reconstruct:
        old_vecs = np.vstack([self._index.reconstruct(e.idx) for e in keep_entries])
        new_index = faiss.IndexFlatIP(self.dim)
        new_index.add(old_vecs)
        for i, entry in enumerate(keep_entries):
            entry.idx = i
        self._index = new_index
        self._entries = keep_entries

    def save(self) -> None:
        import faiss

        faiss.write_index(self._index, str(self.index_path))
        meta = [
            {
                "idx": e.idx,
                "text": e.text,
                "location_id": e.location_id,
                "npc_id": e.npc_id,
                "turn": e.turn,
                "tags": e.tags,
            }
            for e in self._entries
        ]
        self.meta_path.write_text(json.dumps(meta))
        log.debug("FAISS index saved: %d entries", len(self._entries))

    def __len__(self) -> int:
        return len(self._entries)
