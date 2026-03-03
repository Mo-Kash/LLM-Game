"""Lightweight sentence-transformer embedder with SQLite cache."""

from __future__ import annotations
import hashlib
import json
import logging
import sqlite3
from pathlib import Path
from typing import List, Optional

import numpy as np

log = logging.getLogger(__name__)

_model = None  # lazy-loaded singleton


def _get_model(model_name: str):
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer

        log.info("Loading embedding model: %s", model_name)
        _model = SentenceTransformer(model_name, device="cpu")
        log.info("Embedding model loaded.")
    return _model


class Embedder:
    def __init__(self, model_name: str, cache_path: Path, dim: int = 384):
        self.model_name = model_name
        self.dim = dim
        self._cache_conn = sqlite3.connect(str(cache_path), check_same_thread=False)
        self._cache_conn.execute(
            "CREATE TABLE IF NOT EXISTS cache (hash TEXT PRIMARY KEY, vector BLOB)"
        )
        self._cache_conn.commit()

    def _hash(self, text: str) -> str:
        return hashlib.sha256(text.encode()).hexdigest()

    def embed(self, text: str) -> np.ndarray:
        h = self._hash(text)
        row = self._cache_conn.execute(
            "SELECT vector FROM cache WHERE hash=?", (h,)
        ).fetchone()
        if row:
            return np.frombuffer(row[0], dtype=np.float32).copy()
        model = _get_model(self.model_name)
        vec = model.encode(text, normalize_embeddings=True).astype(np.float32)
        self._cache_conn.execute(
            "INSERT OR REPLACE INTO cache (hash, vector) VALUES (?, ?)",
            (h, vec.tobytes()),
        )
        self._cache_conn.commit()
        return vec

    def embed_batch(self, texts: List[str]) -> np.ndarray:
        return np.vstack([self.embed(t) for t in texts])

    def close(self) -> None:
        self._cache_conn.close()
