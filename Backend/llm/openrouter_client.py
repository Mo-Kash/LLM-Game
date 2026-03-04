"""OpenRouter LLM client — OpenAI-compatible REST API wrapper."""

from __future__ import annotations
import json
import logging
import re
import sys
from typing import Iterator, Optional

import httpx

log = logging.getLogger(__name__)

_JSON_FENCE = re.compile(r"```(?:json)?\s*(\{.*?})\s*```", re.DOTALL)
_JSON_RAW = re.compile(r"(\{.*})", re.DOTALL)


class OpenRouterClient:
    def __init__(
        self, base_url: str, model: str, api_key: str = "openrouter", timeout: int = 30
    ):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.api_key = api_key
        self.timeout = timeout

    # ── Connectivity check ─────────────────────────────────────────────────
    def ping(self) -> bool:
        try:
            r = httpx.get(
                f"{self.base_url}/models",
                timeout=5,
                headers={"Authorization": f"Bearer {self.api_key}"},
            )
            return r.status_code == 200
        except Exception as exc:
            log.error("OpenRouter unreachable: %s", exc)
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
        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": stream,
        }
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }

        if not stream:
            with httpx.Client(timeout=self.timeout) as client:
                r = client.post(
                    f"{self.base_url}/chat/completions", json=payload, headers=headers
                )
                r.raise_for_status()
                data = r.json()
                return data["choices"][0]["message"]["content"]
        else:
            return self._stream_generate(payload, headers)

    def _stream_generate(self, payload: dict, headers: dict) -> str:
        """SSE streaming; prints NPC dialogue tokens live, returns full text."""
        full_text = []
        in_dialogue = False
        dialogue_key = '"npc_response":'

        with httpx.Client(timeout=self.timeout) as client:
            with client.stream(
                "POST",
                f"{self.base_url}/chat/completions",
                json=payload,
                headers=headers,
            ) as r:
                r.raise_for_status()
                for line in r.iter_lines():
                    if not line.startswith("data: "):
                        continue
                    data_str = line[6:]
                    if data_str.strip() == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data_str)
                        token = chunk["choices"][0].get("delta", {}).get("content", "")
                        if token:
                            full_text.append(token)
                            # Detect when we enter npc_response value for live output
                            combined = "".join(full_text)
                            if not in_dialogue and dialogue_key in combined:
                                in_dialogue = True
                            if in_dialogue:
                                sys.stdout.write(token)
                                sys.stdout.flush()
                    except Exception:
                        pass
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
