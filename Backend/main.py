#!/usr/bin/env python3
"""
NPC Engine — CLI game loop.
Usage:
    python main.py [--npc <npc_id>] [--reset]
"""

from __future__ import annotations
import argparse
import json
import logging
import sys
from pathlib import Path

import config
from core.event_store import EventStore
from core.reducer import rebuild_state
from core.snapshot import load_snapshot, save_snapshot
from memory.embedder import Embedder
from memory.faiss_index import FAISSMemory
from memory.short_term import ShortTermMemory
from llm.cerebras_client import CerebrasClient
from game.world_loader import load_world_seed
from graph.definition import build_graph, TurnState
from schemas.events import Event, EventType

logging.basicConfig(
    level=logging.WARNING,
    format="%(levelname)s %(name)s: %(message)s",
)
log = logging.getLogger("main")


BANNER = """\033[1;33m
╔═══════════════════════════════════════╗
║   THE RUSTED FLAGON — NPC ENGINE      ║
║   Ontology-Aware RAG Dialogue System  ║
╚═══════════════════════════════════════╝\033[0m
Type your dialogue or action. Commands:
  /npc <id>   — switch active NPC
  /look       — describe current location
  /inv        — show inventory
  /where      — show current location
  /npcs       — list NPCs in this location
  /quit       — exit
"""

COMMANDS = {"/npc", "/look", "/inv", "/where", "/npcs", "/quit"}


def handle_command(cmd: str, world, active_npc_id: str) -> tuple[str, str]:
    """Returns (output_text, new_active_npc_id)."""
    parts = cmd.strip().split(maxsplit=1)
    verb = parts[0].lower()
    loc = world.locations.get(world.player.current_location_id)

    if verb == "/quit":
        print("\n\033[2mFarewell, traveller.\033[0m\n")
        sys.exit(0)

    elif verb == "/look":
        if loc:
            npcs_here = [
                n.name
                for n in world.npcs.values()
                if n.location_id == loc.id and n.alive
            ]
            objs_here = [
                o.name for o in world.objects.values() if o.location_id == loc.id
            ]
            exits = loc.connected_to
            txt = (
                f"\n\033[1m{loc.name}\033[0m\n{loc.description}\n"
                f"NPCs: {', '.join(npcs_here) or 'none'}\n"
                f"Objects: {', '.join(objs_here) or 'none'}\n"
                f"Exits: {', '.join(exits) or 'none'}"
            )
            print(txt)
        return "", active_npc_id

    elif verb == "/inv":
        items = [
            world.objects[o].name for o in world.player.inventory if o in world.objects
        ]
        print(f"\033[1mInventory:\033[0m {', '.join(items) or 'empty'}")
        return "", active_npc_id

    elif verb == "/where":
        print(f"\033[1mLocation:\033[0m {loc.name if loc else '?'}")
        return "", active_npc_id

    elif verb == "/npcs":
        npcs = [
            f"{n.name} ({n.id})"
            for n in world.npcs.values()
            if n.location_id == world.player.current_location_id and n.alive
        ]
        print(f"\033[1mNPCs here:\033[0m {', '.join(npcs) or 'none'}")
        return "", active_npc_id

    elif verb == "/npc":
        if len(parts) < 2:
            print("Usage: /npc <npc_id>")
            return "", active_npc_id
        new_id = parts[1].strip()
        if new_id not in world.npcs:
            print(f"Unknown NPC id: {new_id}")
            return "", active_npc_id
        npc = world.npcs[new_id]
        if npc.location_id != world.player.current_location_id:
            print(f"{npc.name} is not in this location.")
            return "", active_npc_id
        print(f"\033[2mNow talking to: {npc.name}\033[0m")
        return "", new_id

    return "", active_npc_id


def startup(reset: bool, default_npc: str) -> tuple:
    """Initialise all subsystems; return (world, graph, commit_node, components...)."""
    seed = load_world_seed(config.WORLD_SEED_PATH)

    # ── Event store ────────────────────────────────────────────────────────
    store = EventStore(config.DB_PATH)

    # ── World state ────────────────────────────────────────────────────────
    if reset:
        config.DB_PATH.unlink(missing_ok=True)
        config.SNAPSHOT_PATH.unlink(missing_ok=True)
        config.FAISS_INDEX_PATH.unlink(missing_ok=True)
        config.FAISS_META_PATH.unlink(missing_ok=True)
        store = EventStore(config.DB_PATH)
        world = seed.model_copy(deep=True)
        # Record session start
        store.append(Event(turn=0, event_type=EventType.SESSION_START, payload={}))
        log.info("Fresh session started.")
    else:
        snapshot = load_snapshot(config.SNAPSHOT_PATH)
        if snapshot:
            world, last_event_id = snapshot
            # Replay only events after snapshot
            delta_events = [
                e
                for e in store.load_from_turn(world.turn)
                if (e.id or 0) > last_event_id
            ]
            from core.reducer import apply_event

            for e in delta_events:
                world = apply_event(world, e)
            log.info(
                "Resumed from snapshot (turn=%d) + %d delta events",
                world.turn,
                len(delta_events),
            )
        else:
            all_events = store.load_all()
            if all_events:
                world = rebuild_state(seed, all_events)
                log.info(
                    "Rebuilt state from %d events (turn=%d)",
                    len(all_events),
                    world.turn,
                )
            else:
                world = seed.model_copy(deep=True)
                store.append(
                    Event(turn=0, event_type=EventType.SESSION_START, payload={})
                )
                log.info("No prior session found; starting fresh.")

    # ── Memory subsystems ──────────────────────────────────────────────────
    embedder = Embedder(
        config.EMBEDDING_MODEL, config.EMBED_CACHE_PATH, config.EMBEDDING_DIM
    )
    faiss_mem = FAISSMemory(
        config.FAISS_INDEX_PATH, config.FAISS_META_PATH, config.EMBEDDING_DIM
    )
    short_term = ShortTermMemory(config.MAX_SHORT_TERM_TURNS)

    # ── LLM client ─────────────────────────────────────────────────────────
    client = CerebrasClient(
        model=config.MODEL_NAME,
        api_key=config.CEREBRAS_API_KEY,
        timeout=config.REQUEST_TIMEOUT,
    )

    # ── Graph ──────────────────────────────────────────────────────────────
    graph, commit_node = build_graph(
        store, embedder, faiss_mem, short_term, client, seed
    )

    # Resolve default NPC
    npc_id = default_npc
    if npc_id not in world.npcs:
        # Pick first NPC in starting location
        loc_id = world.player.current_location_id
        candidates = [
            n.id for n in world.npcs.values() if n.location_id == loc_id and n.alive
        ]
        npc_id = candidates[0] if candidates else list(world.npcs.keys())[0]

    return world, graph, commit_node, store, embedder, faiss_mem, client, npc_id


def game_loop(
    world, graph, commit_node, store, embedder, faiss_mem, client, active_npc_id
):
    """Main interactive loop."""
    print(BANNER)
    print(f"\033[2mSession resuming at turn {world.turn}.\033[0m")

    # Show opening look
    loc = world.locations.get(world.player.current_location_id)
    if loc:
        npcs_here = [
            n.name for n in world.npcs.values() if n.location_id == loc.id and n.alive
        ]
        print(f"\n\033[1m{loc.name}\033[0m — {loc.description}")
        if npcs_here:
            print(f"You see: {', '.join(npcs_here)}.")
    npc = world.npcs.get(active_npc_id)
    if npc:
        print(f"\033[2mYou are speaking with: {npc.name}\033[0m\n")

    # Connectivity check
    if not client.ping():
        print(
            "\033[1;31m[WARNING] Cerebras not reachable. Check your API key "
            f"and network connection. Model: '{config.MODEL_NAME}'.\033[0m\n"
        )

    while True:
        try:
            raw_input = input("\033[1;32m> \033[0m").strip()
        except (KeyboardInterrupt, EOFError):
            print("\n\033[2mGame paused.\033[0m")
            faiss_mem.save()
            break

        if not raw_input:
            continue

        # Handle slash commands
        if raw_input.startswith("/"):
            _, active_npc_id = handle_command(raw_input, world, active_npc_id)
            continue

        # Build initial turn state
        turn_state: TurnState = {
            "player_input": raw_input,
            "active_npc_id": active_npc_id,
            "world": world,
            "query_vec": None,
            "retrieved_memories": [],
            "prompt": "",
            "raw_llm_output": "",
            "parsed_output": None,
            "valid_events": [],
            "validation_errors": [],
            "npc_dialogue": "",
            "turn_errors": [],
            "elapsed_ms": 0.0,
        }

        try:
            result = graph.invoke(turn_state)
            world = result["world"]  # get updated world back
            active_npc_id = result["active_npc_id"]
        except Exception as exc:
            log.error("Graph execution error: %s", exc, exc_info=True)
            print(f"\033[1;31m[System error — turn skipped: {exc}]\033[0m")


def main():
    parser = argparse.ArgumentParser(description="NPC Engine CLI")
    parser.add_argument(
        "--npc",
        default="gareth_barkeep",
        help="Starting NPC id (default: gareth_barkeep)",
    )
    parser.add_argument(
        "--reset", action="store_true", help="Wipe saved state and start fresh"
    )
    parser.add_argument("--debug", action="store_true", help="Enable debug logging")
    args = parser.parse_args()

    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)

    world, graph, commit_node, store, embedder, faiss_mem, client, npc_id = startup(
        args.reset, args.npc
    )

    try:
        game_loop(world, graph, commit_node, store, embedder, faiss_mem, client, npc_id)
    finally:
        faiss_mem.save()
        store.close()
        embedder.close()


if __name__ == "__main__":
    main()
