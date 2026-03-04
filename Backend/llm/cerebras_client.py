"""Cerebras LLM client — wrapper for Cerebras Cloud SDK."""

from __future__ import annotations
import json
import logging
import re
import sys
from typing import Iterator, Optional

from cerebras.cloud.sdk import Cerebras

log = logging.getLogger(__name__)

_JSON_FENCE = re.compile(r"```(?:json)?\s*(\{.*?})\s*```", re.DOTALL)
_JSON_RAW = re.compile(r"(\{.*})", re.DOTALL)


class CerebrasClient:
    def __init__(self, model: str, api_key: Optional[str] = None, timeout: int = 30):
        self.model = model
        self.client = Cerebras(
            api_key=api_key,
            timeout=timeout,
        )

    # ── Connectivity check ─────────────────────────────────────────────────
    def ping(self) -> bool:
        try:
            # Simple check to see if we can list models or similar
            # Cerebras SDK might not have a direct ping, but we can try a tiny completion
            self.client.chat.completions.create(
                messages=[{"role": "user", "content": "ping"}],
                model=self.model,
                max_tokens=1,
            )
            return True
        except Exception as exc:
            log.error("Cerebras unreachable or error: %s", exc)
            return False

    # ── Single generation ─────────────────────────────────────────────────
    def generate(
        self,
        prompt: str,
        max_tokens: int = 512,
        temperature: float = 0.35,
        stream: bool = False,
    ) -> str:
        """
        Returns full response text.
        If stream=True, tokens are printed to stdout in real-time
        and the full assembled string is returned.
        """
        if not stream:
            response = self.client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model=self.model,
                max_tokens=max_tokens,
                temperature=temperature,
            )
            return response.choices[0].message.content
        else:
            return self._stream_generate(prompt, max_tokens, temperature)

    def _stream_generate(self, prompt: str, max_tokens: int, temperature: float) -> str:
        """SSE streaming; prints NPC dialogue tokens live, returns full text."""
        full_text = []
        in_dialogue = False
        dialogue_key = '"npc_response":'

        stream = self.client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model=self.model,
            max_tokens=max_tokens,
            temperature=temperature,
            stream=True,
        )

        for chunk in stream:
            token = chunk.choices[0].delta.content or ""
            if token:
                full_text.append(token)
                # Detect when we enter npc_response value for live output
                combined = "".join(full_text)
                if not in_dialogue and dialogue_key in combined:
                    in_dialogue = True
                if in_dialogue:
                    sys.stdout.write(token)
                    sys.stdout.flush()

        if in_dialogue:
            print()  # newline after streamed dialogue
        return "".join(full_text)

    # ── JSON extraction ───────────────────────────────────────────────────
    @staticmethod
    def extract_json(raw: str) -> Optional[dict]:
        """Extract JSON dict from raw LLM output (handles markdown fences)."""
        # Try fenced block first
        m = _JSON_FENCE.search(raw)
        if m:
            try:
                return json.loads(m.group(1))
            except json.JSONDecodeError:
                pass
        # Try raw JSON
        m = _JSON_RAW.search(raw)
        if m:
            try:
                return json.loads(m.group(1))
            except json.JSONDecodeError:
                pass
        log.warning("Could not extract JSON from LLM output.")
        return None
