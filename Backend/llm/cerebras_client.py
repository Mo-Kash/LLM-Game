"""Cerebras LLM client — wrapper for Cerebras Cloud SDK."""

from __future__ import annotations
import json
import logging
import re
import sys
import time
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
        max_tokens: int = 4096,
        temperature: float = 0.35,
        stream: bool = False,
        max_retries: int = 3,
    ) -> str:
        """
        Returns full response text.
        Handles retries for rate limits (429).
        """
        retries = 0
        backoff = 1.0  # seconds

        while retries <= max_retries:
            try:
                if not stream:
                    response = self.client.chat.completions.create(
                        messages=[{"role": "user", "content": prompt}],
                        model=self.model,
                        max_tokens=max_tokens,
                        temperature=temperature,
                        frequency_penalty=0.15,
                        presence_penalty=0.05,
                    )
                    return response.choices[0].message.content or ""
                else:
                    return self._stream_generate(prompt, max_tokens, temperature)
            except Exception as exc:
                is_rate_limit = (
                    "429" in str(exc)
                    or "rate_limit" in str(exc).lower()
                    or "too_many_requests" in str(exc).lower()
                )

                if is_rate_limit and retries < max_retries:
                    log.warning(
                        f"Rate limited by Cerebras. Retrying in {backoff}s... (Attempt {retries + 1}/{max_retries})"
                    )
                    time.sleep(backoff)
                    retries += 1
                    backoff *= 2  # Exponential backoff
                    continue

                log.error(f"Cerebras generation error (Attempt {retries + 1}): {exc}")
                if retries >= max_retries:
                    raise exc

                # For non-429 errors, maybe retry once or just raise
                retries += 1
                time.sleep(1)

        return ""

    def _stream_generate(self, prompt: str, max_tokens: int, temperature: float) -> str:
        """SSE streaming; returns full text."""
        full_text = []

        stream = self.client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model=self.model,
            max_tokens=max_tokens,
            temperature=temperature,
            frequency_penalty=0.15,
            presence_penalty=0.05,
            stream=True,
        )

        for chunk in stream:
            token = chunk.choices[0].delta.content or ""
            if token:
                full_text.append(token)

        return "".join(full_text)

    # ── JSON extraction ───────────────────────────────────────────────────
    @staticmethod
    def extract_json(raw: Optional[str]) -> Optional[dict]:
        """Extract JSON dict from raw LLM output. Attempts to fix minor truncation."""
        if not raw:
            return None

        def _try_parse(text: str) -> Optional[dict]:
            text = text.strip()
            # 1. Direct try
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                pass

            # 2. Try adding missing braces/quotes (recursive-ish fixes)
            # Common truncation: missing last " or }
            attempts = [
                text + '"',
                text + "}",
                text + '"}',
                text + '"]}',
                text + "}]}",
            ]
            for candidate in attempts:
                try:
                    return json.loads(candidate)
                except json.JSONDecodeError:
                    continue
            return None

        # Try fenced block first
        m = _JSON_FENCE.search(raw)
        if m:
            res = _try_parse(m.group(1))
            if res:
                return res

        # Try raw JSON (first { to last })
        m = _JSON_RAW.search(raw)
        if m:
            res = _try_parse(m.group(1))
            if res:
                return res

        # Last resort: try whole thing
        return _try_parse(raw)
