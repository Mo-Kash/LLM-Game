"""
LangGraph shallow orchestration graph — one node per pipeline stage.
No branching LLM nodes. No loops. Linear DAG only.
"""

from __future__ import annotations
import json
import logging
import sys
import time
from typing import Any, Dict, List, Optional

from langgraph.graph import StateGraph, END
from typing_extensions import TypedDict

import config
from schemas.world_state import WorldState
from schemas.llm_output import LLMOutput
from schemas.events import Event, EventType
from core.event_store import EventStore
from core.reducer import apply_event
from core.snapshot import save_snapshot
from memory.embedder import Embedder
from memory.faiss_index import FAISSMemory
from memory.short_term import ShortTermMemory
from llm.cerebras_client import CerebrasClient
from llm.prompt_builder import build_prompt
from game.validator import validate_and_build_events

log = logging.getLogger(__name__)


# ── Graph State ────────────────────────────────────────────────────────────


class TurnState(TypedDict):
    # Inputs
    player_input: str
    active_npc_id: str
    world: WorldState
    # Pipeline intermediates
    query_vec: Optional[Any]  # np.ndarray
    retrieved_memories: List[Any]  # List[MemoryEntry]
    prompt: str
    raw_llm_output: str
    parsed_output: Optional[LLMOutput]
    valid_events: List[Event]
    validation_errors: List[str]
    # Output
    npc_dialogue: str
    turn_errors: List[str]
    elapsed_ms: float


# ── Node implementations ───────────────────────────────────────────────────


def node_input(state: TurnState) -> TurnState:
    """Validates presence of required inputs."""
    if not state.get("player_input", "").strip():
        state["player_input"] = "(silence)"
    return state


def make_node_retrieval(
    embedder: Embedder, memory: FAISSMemory, top_k: int = config.TOP_K_RETRIEVAL
):
    def node_retrieval(state: TurnState) -> TurnState:
        t0 = time.perf_counter()
        text = state["player_input"]
        vec = embedder.embed(text)
        state["query_vec"] = vec
        world: WorldState = state["world"]
        results = memory.search(
            vec,
            top_k=top_k,
            filter_location=world.player.current_location_id,
            filter_npc=state["active_npc_id"],
        )
        # If few results, retry without location filter
        if len(results) < 2:
            results = memory.search(vec, top_k=top_k)
        state["retrieved_memories"] = results
        log.debug(
            "Retrieval: %d memories in %.0fms",
            len(results),
            (time.perf_counter() - t0) * 1000,
        )
        return state

    return node_retrieval


def make_node_prompt_assembly(
    short_term: ShortTermMemory, max_chars: int = config.MAX_CONTEXT_CHARS
):
    def node_prompt_assembly(state: TurnState) -> TurnState:
        history = short_term.format_for_prompt()
        prompt = build_prompt(
            world=state["world"],
            active_npc_id=state["active_npc_id"],
            player_input=state["player_input"],
            memories=state["retrieved_memories"],
            history=history,
            max_chars=max_chars,
        )
        state["prompt"] = prompt
        log.debug("Prompt assembled: %d chars", len(prompt))
        return state

    return node_prompt_assembly


def make_node_llm_generation(client: CerebrasClient):
    def node_llm_generation(state: TurnState) -> TurnState:
        t0 = time.perf_counter()
        raw = client.generate(
            state["prompt"],
            max_tokens=config.MAX_GENERATION_TOKENS,
            temperature=config.TEMPERATURE,
            stream=False,  # streaming handled at output node
        )
        state["raw_llm_output"] = raw
        state["elapsed_ms"] = (time.perf_counter() - t0) * 1000
        log.debug("LLM generation: %.0fms", state["elapsed_ms"])
        return state

    return node_llm_generation


def node_json_parsing(state: TurnState) -> TurnState:
    raw = state.get("raw_llm_output") or ""
    parsed_dict = CerebrasClient.extract_json(raw)
    if parsed_dict is None:
        log.warning("JSON parse failed — using fallback dialogue.")
        state["parsed_output"] = None
        state["turn_errors"] = state.get("turn_errors", []) + ["JSON parse failed"]
        # Fallback: treat raw as dialogue
        state["npc_dialogue"] = raw.strip() or "…"
    else:
        try:
            output = LLMOutput(**parsed_dict)
            state["parsed_output"] = output
            state["npc_dialogue"] = output.npc_response
        except Exception as exc:
            log.warning("LLMOutput schema validation failed: %s", exc)
            state["parsed_output"] = None
            state["npc_dialogue"] = parsed_dict.get("npc_response", raw.strip() or "…")
            state["turn_errors"] = state.get("turn_errors", []) + [
                f"Schema error: {exc}"
            ]
    return state


def make_node_world_validation(world: WorldState):
    def node_world_validation(state: TurnState) -> TurnState:
        output: Optional[LLMOutput] = state.get("parsed_output")
        if output is None:
            state["valid_events"] = []
            state["validation_errors"] = ["No parsed output to validate"]
            return state
        turn = state["world"].turn + 1
        valid_events, errors = validate_and_build_events(output, state["world"], turn)
        state["valid_events"] = valid_events
        state["validation_errors"] = errors
        if errors:
            log.warning("Validation errors: %s", errors)
        return state

    return node_world_validation


def make_node_event_commit(
    store: EventStore,
    memory: FAISSMemory,
    embedder: Embedder,
    short_term: ShortTermMemory,
    seed: WorldState,
    snapshot_interval: int,
):
    # Mutable reference to shared world — updated in-place per turn
    _world_ref = {"world": None}  # set externally after node creation

    def set_world(w: WorldState):
        _world_ref["world"] = w

    def node_event_commit(state: TurnState) -> TurnState:
        world: WorldState = state["world"]
        turn = world.turn + 1

        # Always append NPC_SPOKE event
        spoke_event = Event(
            turn=turn,
            event_type=EventType.NPC_SPOKE,
            payload={
                "npc_id": state["active_npc_id"],
                "text": state["npc_dialogue"][:500],
            },
        )
        store.append(spoke_event)

        # Apply validated world updates
        for event in state["valid_events"]:
            store.append(event)
            world = apply_event(world, event)

        world.turn = turn

        # Update short-term memory
        short_term.record(
            turn=turn,
            player_input=state["player_input"],
            npc_response=state["npc_dialogue"],
            npc_id=state["active_npc_id"],
        )

        # Add memory summary to FAISS
        output: Optional[LLMOutput] = state.get("parsed_output")
        summary = (
            output.memory_summary
            if output and output.memory_summary
            else f"Turn {turn}: {state['player_input'][:80]}"
        )
        if state.get("query_vec") is not None:
            memory.add(
                vec=state["query_vec"],
                text=summary,
                location_id=world.player.current_location_id,
                npc_id=state["active_npc_id"],
                turn=turn,
            )
        else:
            vec = embedder.embed(summary)
            memory.add(
                vec=vec,
                text=summary,
                location_id=world.player.current_location_id,
                npc_id=state["active_npc_id"],
                turn=turn,
            )

        # Prune memory if needed
        if len(memory) > config.MEMORY_PRUNE_THRESHOLD:
            memory.prune_oldest(config.MEMORY_PRUNE_THRESHOLD // 2)

        # Periodic snapshot + FAISS save
        if turn % snapshot_interval == 0:
            last_id = (
                store._connect().execute("SELECT MAX(id) FROM events").fetchone()[0]
                or 0
            )
            save_snapshot(world, config.SNAPSHOT_PATH, last_id)
            memory.save()
            log.info("Snapshot + FAISS saved at turn %d", turn)

        # Propagate updated world back to state
        state["world"] = world
        _world_ref["world"] = world
        return state

    node_event_commit._set_world = set_world
    return node_event_commit


def node_output(state: TurnState) -> TurnState:
    """Emit NPC dialogue to stdout."""
    npc_id = state.get("active_npc_id", "NPC")
    world = state["world"]
    npc = world.npcs.get(npc_id)
    npc_name = npc.name if npc else npc_id
    elapsed = state.get("elapsed_ms", 0)

    print(f"\n\033[1;36m{npc_name}:\033[0m {state['npc_dialogue']}")
    print(f"\033[2m[Turn {world.turn} | {elapsed:.0f}ms]\033[0m")

    if state.get("validation_errors"):
        for err in state["validation_errors"]:
            log.debug("Validation: %s", err)

    return state


# ── Graph builder ──────────────────────────────────────────────────────────


def build_graph(
    store: EventStore,
    embedder: Embedder,
    memory: FAISSMemory,
    short_term: ShortTermMemory,
    client: CerebrasClient,
    seed: WorldState,
    snapshot_interval: int = config.SNAPSHOT_INTERVAL,
):
    """Build and compile the LangGraph execution graph."""

    retrieval_node = make_node_retrieval(embedder, memory)
    prompt_node = make_node_prompt_assembly(short_term)
    llm_node = make_node_llm_generation(client)
    validation_node = make_node_world_validation(seed)  # seed used for schema ref
    commit_node = make_node_event_commit(
        store, memory, embedder, short_term, seed, snapshot_interval
    )

    g = StateGraph(TurnState)
    g.add_node("input", node_input)
    g.add_node("retrieval", retrieval_node)
    g.add_node("prompt", prompt_node)
    g.add_node("llm", llm_node)
    g.add_node("parse", node_json_parsing)
    g.add_node("validate", validation_node)
    g.add_node("commit", commit_node)
    g.add_node("output", node_output)

    g.set_entry_point("input")
    g.add_edge("input", "retrieval")
    g.add_edge("retrieval", "prompt")
    g.add_edge("prompt", "llm")
    g.add_edge("llm", "parse")
    g.add_edge("parse", "validate")
    g.add_edge("validate", "commit")
    g.add_edge("commit", "output")
    g.add_edge("output", END)

    return g.compile(), commit_node
