"""
Session manager — each web session gets its own isolated game engine instance.

Each session holds:
  - Its own EventStore (shared SQLite DB, isolated by session prefix)
  - Its own WorldState
  - Its own FAISS memory index
  - Its own ShortTermMemory
  - A reference to the shared LLM client and Embedder (stateless / thread-safe)
  - The compiled LangGraph

Sessions are UUID-keyed and stored in-memory with per-session data dirs.
"""

from __future__ import annotations
import asyncio
import json
import logging
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

import config
from core.event_store import EventStore
from core.reducer import rebuild_state, apply_event
from core.snapshot import load_snapshot, save_snapshot
from memory.embedder import Embedder
from memory.faiss_index import FAISSMemory
from memory.short_term import ShortTermMemory
from llm.cerebras_client import CerebrasClient
from game.world_loader import load_world_seed
from graph.definition import build_graph, TurnState
from schemas.events import Event, EventType

log = logging.getLogger(__name__)


class GameSession:
    """Encapsulates all state for a single game session."""

    __slots__ = (
        "session_id",
        "created_at",
        "world",
        "graph",
        "commit_node",
        "store",
        "faiss_mem",
        "short_term",
        "active_npc_id",
        "data_dir",
        "_lock",
        "ws_connections",
        "dialogue_history",
    )

    def __init__(
        self,
        session_id: str,
        world: Any,
        graph: Any,
        commit_node: Any,
        store: EventStore,
        faiss_mem: FAISSMemory,
        short_term: ShortTermMemory,
        active_npc_id: str,
        data_dir: Path,
    ):
        self.session_id = session_id
        self.created_at = time.time()
        self.world = world
        self.graph = graph
        self.commit_node = commit_node
        self.store = store
        self.faiss_mem = faiss_mem
        self.short_term = short_term
        self.active_npc_id = active_npc_id
        self.data_dir = data_dir
        self._lock = asyncio.Lock()
        self.ws_connections: Set[Any] = set()
        self.dialogue_history: list = []

    def close(self):
        """Persist and release resources."""
        try:
            self.faiss_mem.save()
            self.store.close()
        except Exception as exc:
            log.error("Error closing session %s: %s", self.session_id, exc)


class SessionManager:
    """
    Creates, stores, retrieves, and destroys game sessions.
    Shared resources (Embedder, CerebrasClient) are initialised once.
    """

    def __init__(self):
        self._sessions: Dict[str, GameSession] = {}
        self._embedder: Optional[Embedder] = None
        self._client: Optional[CerebrasClient] = None
        self._seed = None
        self._initialised = False
        self._init_lock = asyncio.Lock()

    # ── Lazy initialisation of heavy singletons ────────────────────────────

    async def _ensure_init(self):
        if self._initialised:
            return
        async with self._init_lock:
            if self._initialised:
                return
            log.info("Initialising shared game resources...")
            loop = asyncio.get_event_loop()
            self._seed = await loop.run_in_executor(
                None, load_world_seed, config.WORLD_SEED_PATH
            )
            self._embedder = await loop.run_in_executor(
                None,
                lambda: Embedder(
                    config.EMBEDDING_MODEL,
                    config.EMBED_CACHE_PATH,
                    config.EMBEDDING_DIM,
                ),
            )
            self._client = CerebrasClient(
                model=config.MODEL_NAME,
                api_key=config.CEREBRAS_API_KEY,
                timeout=config.REQUEST_TIMEOUT,
            )
            # Warm the embedding model by encoding a dummy sentence
            if self._embedder:
                self._embedder.embed("warm up sentence")
                log.info("Embedding model warmed up.")
            self._initialised = True
            log.info("Shared resources ready.")

    # ── Session lifecycle ──────────────────────────────────────────────────

    async def create_session(
        self,
        name: str,
        gender: str,
        age: int,
        occupation: str,
        default_npc_id: str = "gareth_barkeep",
        reset: bool = False,
    ) -> GameSession:
        await self._ensure_init()

        if len(self._sessions) >= config.MAX_CONCURRENT_SESSIONS:
            raise RuntimeError(
                f"Maximum concurrent sessions ({config.MAX_CONCURRENT_SESSIONS}) reached"
            )

        session_id = str(uuid.uuid4())
        data_dir = config.DATA_DIR / "sessions" / session_id
        data_dir.mkdir(parents=True, exist_ok=True)

        db_path = data_dir / "events.db"
        faiss_index_path = data_dir / "faiss.index"
        faiss_meta_path = data_dir / "faiss_meta.json"
        snapshot_path = data_dir / "snapshot.json"

        loop = asyncio.get_event_loop()

        def _create():
            store = EventStore(db_path)
            world = self._seed.model_copy(deep=True)

            # Initialize player metadata
            world.player.name = name
            world.player.gender = gender
            world.player.age = age
            world.player.occupation = occupation

            store.append(Event(turn=0, event_type=EventType.SESSION_START, payload={}))

            faiss_mem = FAISSMemory(
                faiss_index_path, faiss_meta_path, config.EMBEDDING_DIM
            )
            short_term = ShortTermMemory(config.MAX_SHORT_TERM_TURNS)

            graph, commit_node = build_graph(
                store,
                self._embedder,
                faiss_mem,
                short_term,
                self._client,
                self._seed,
            )

            # Resolve NPC
            npc_id = default_npc_id
            if npc_id not in world.npcs:
                loc_id = world.player.current_location_id
                candidates = [
                    n.id
                    for n in world.npcs.values()
                    if n.location_id == loc_id and n.alive
                ]
                npc_id = candidates[0] if candidates else list(world.npcs.keys())[0]

            world.active_npc_id = npc_id

            return GameSession(
                session_id=session_id,
                world=world,
                graph=graph,
                commit_node=commit_node,
                store=store,
                faiss_mem=faiss_mem,
                short_term=short_term,
                active_npc_id=npc_id,
                data_dir=data_dir,
            )

        session = await loop.run_in_executor(None, _create)
        self._sessions[session_id] = session

        # Save initial state so it appears in the list immediately
        await self.save_session(session_id, is_auto=True)

        log.info(
            "Session created: %s (Player: %s, NPC: %s)",
            session_id,
            name,
            session.active_npc_id,
        )
        return session

    async def list_sessions(self) -> List[Dict[str, Any]]:
        """List all sessions/saves saved on disk."""
        sessions_dir = config.DATA_DIR / "sessions"
        if not sessions_dir.exists():
            return []

        results = []
        for s_dir in sessions_dir.iterdir():
            if not s_dir.is_dir():
                continue

            for save_type in ["manual", "auto"]:
                fname = (
                    "snapshot.json" if save_type == "manual" else "snapshot_auto.json"
                )
                snapshot_path = s_dir / fname
                if snapshot_path.exists():
                    try:
                        data = json.loads(snapshot_path.read_text())
                        world = data["world_state"]
                        loc_id = world["player"]["current_location_id"]
                        loc_name = (
                            world["locations"].get(loc_id, {}).get("name", loc_id)
                        )

                        results.append(
                            {
                                "session_id": f"{s_dir.name}:{save_type}",
                                "player_name": world["player"]["name"],
                                "location_name": loc_name,
                                "turn": world["turn"],
                                "created_at": snapshot_path.stat().st_mtime,
                                "is_auto": save_type == "auto",
                            }
                        )
                    except Exception:
                        continue
        return sorted(results, key=lambda x: x["created_at"], reverse=True)

    async def load_session(self, session_id: str) -> Optional[GameSession]:
        """Load a session/save from disk if it exists."""
        save_type = "manual"
        original_id = session_id
        if ":" in session_id:
            original_id, save_type = session_id.split(":", 1)

        if original_id in self._sessions:
            self._sessions.pop(original_id).close()

        await self._ensure_init()
        data_dir = config.DATA_DIR / "sessions" / original_id
        if not data_dir.exists():
            return None

        # Similar logic to _create but loading from existing files
        db_path = data_dir / "events.db"
        faiss_index_path = data_dir / "faiss.index"
        faiss_meta_path = data_dir / "faiss_meta.json"

        snapshot_fname = (
            "snapshot.json" if save_type == "manual" else "snapshot_auto.json"
        )
        snapshot_path = data_dir / snapshot_fname

        dh_fname = "dialogue.json" if save_type == "manual" else "dialogue_auto.json"
        dh_path = data_dir / dh_fname

        loop = asyncio.get_event_loop()

        def _load():
            store = EventStore(db_path)
            snap = load_snapshot(snapshot_path)
            if snap:
                world, last_id = snap
            else:
                world = self._seed.model_copy(deep=True)
                events = store.load_all()
                world = rebuild_state(world, events)

            faiss_mem = FAISSMemory(
                faiss_index_path, faiss_meta_path, config.EMBEDDING_DIM
            )
            short_term = ShortTermMemory(config.MAX_SHORT_TERM_TURNS)

            graph, commit_node = build_graph(
                store,
                self._embedder,
                faiss_mem,
                short_term,
                self._client,
                self._seed,
            )

            # Determine active NPC from world state
            npc_id = world.active_npc_id or list(world.npcs.keys())[0]

            # Load dialogue_history
            dh = []
            if dh_path.exists():
                try:
                    dh = json.loads(dh_path.read_text())
                except Exception:
                    pass

            sess = GameSession(
                session_id=original_id,
                world=world,
                graph=graph,
                commit_node=commit_node,
                store=store,
                faiss_mem=faiss_mem,
                short_term=short_term,
                active_npc_id=npc_id,
                data_dir=data_dir,
            )
            sess.dialogue_history = dh
            return sess

        try:
            session = await loop.run_in_executor(None, _load)
            self._sessions[original_id] = session
            return session
        except Exception as e:
            log.error("Failed to load session %s: %s", session_id, e)
            return None

    def get_session(self, session_id: str) -> Optional[GameSession]:
        original_id = session_id.split(":")[0]
        return self._sessions.get(original_id)

    def destroy_session(self, session_id: str) -> bool:
        session = self._sessions.pop(session_id, None)
        if session is None:
            return False
        session.close()
        log.info("Session destroyed: %s", session_id)
        return True

    async def save_session(self, session_id: str, is_auto: bool = False):
        """Force save session state to disk."""
        session = self.get_session(session_id)
        if not session:
            return False

        loop = asyncio.get_event_loop()

        def _save():
            session.faiss_mem.save()

            # Use actual last event ID for the snapshot
            last_id = session.store.get_last_id()

            snap_fname = "snapshot_auto.json" if is_auto else "snapshot.json"
            save_snapshot(session.world, session.data_dir / snap_fname, last_id)

            dh_fname = "dialogue_auto.json" if is_auto else "dialogue.json"
            with open(session.data_dir / dh_fname, "w") as f:
                json.dump(session.dialogue_history, f)

        await loop.run_in_executor(None, _save)
        return True

    async def process_action(
        self, session: GameSession, player_input: str, npc_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Process a player action through the LangGraph pipeline. Thread-safe per session."""
        async with session._lock:
            active_npc = npc_id or session.active_npc_id

            turn_state: TurnState = {
                "player_input": player_input,
                "active_npc_id": active_npc,
                "world": session.world,
                "query_vec": None,
                "retrieved_memories": [],
                "prompt": "",
                "raw_llm_output": "",
                "parsed_output": None,
                "valid_events": [],
                "validation_errors": [],
                "narration": "",
                "npc_dialogue": "",
                "turn_errors": [],
                "elapsed_ms": 0.0,
            }

            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(None, session.graph.invoke, turn_state)

            session.world = result["world"]
            session.active_npc_id = result.get("active_npc_id", active_npc)
            session.world.active_npc_id = session.active_npc_id

            # Compute trust change from events
            trust_change = 0
            events_out = []
            for e in result.get("valid_events", []):
                evt_dict = {
                    "type": e.event_type.value,
                    "payload": e.payload,
                }
                events_out.append(evt_dict)
                if e.event_type == EventType.RELATIONSHIP_CHANGED:
                    if e.payload.get("target_id") == "player":
                        trust_change += int(e.payload.get("delta", 0))

            # Determine speaker
            parsed = result.get("parsed_output")
            speaker_id = active_npc
            if parsed and parsed.speaker_id:
                speaker_id = parsed.speaker_id

            npc_obj = session.world.npcs.get(speaker_id)
            if speaker_id == "narrator":
                npc_name = "Narrator"
            else:
                npc_name = npc_obj.name if npc_obj else speaker_id

            return {
                "npc_dialogue": result.get("npc_dialogue", ""),
                "narration": result.get("narration", ""),
                "npc_id": speaker_id,
                "npc_name": npc_name,
                "turn": session.world.turn,
                "trust_change": trust_change,
                "validation_errors": result.get("validation_errors", []),
                "elapsed_ms": result.get("elapsed_ms", 0.0),
                "events": events_out,
            }

    def handle_command(self, session: GameSession, cmd: str) -> Dict[str, str]:
        """Handle slash commands like /look, /inv, /where, /npcs, /npc."""
        parts = cmd.strip().split(maxsplit=1)
        verb = parts[0].lower()
        world = session.world
        loc = world.locations.get(world.player.current_location_id)

        if verb == "/look":
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
                output = (
                    f"{loc.name}\n{loc.description}\n"
                    f"NPCs: {', '.join(npcs_here) or 'none'}\n"
                    f"Objects: {', '.join(objs_here) or 'none'}\n"
                    f"Exits: {', '.join(exits) or 'none'}"
                )
            else:
                output = "You are nowhere."
            return {"output": output, "command": "/look"}

        elif verb == "/inv":
            items = [
                world.objects[o].name
                for o in world.player.inventory
                if o in world.objects
            ]
            output = f"Inventory: {', '.join(items) or 'empty'}"
            return {"output": output, "command": "/inv"}

        elif verb == "/where":
            output = f"Location: {loc.name if loc else '?'}"
            return {"output": output, "command": "/where"}

        elif verb == "/npcs":
            npcs = [
                f"{n.name} ({n.id})"
                for n in world.npcs.values()
                if n.location_id == world.player.current_location_id and n.alive
            ]
            output = f"NPCs here: {', '.join(npcs) or 'none'}"
            return {"output": output, "command": "/npcs"}

        elif verb == "/move":
            if len(parts) < 2:
                return {"output": "Usage: /move <location_id>", "command": "/move"}
            new_loc_id = parts[1].strip()
            if new_loc_id not in world.locations:
                return {
                    "output": f"Unknown location: {new_loc_id}",
                    "command": "/move",
                }
            if new_loc_id not in loc.connected_to:
                target_loc = world.locations.get(new_loc_id)
                target_name = target_loc.name if target_loc else new_loc_id
                return {
                    "output": f"Cannot move to {target_name} from here.",
                    "command": "/move",
                    "error": True,
                }

            # Create move event and apply it
            move_evt = Event(
                turn=world.turn,
                event_type=EventType.PLAYER_MOVED,
                payload={
                    "from_location_id": world.player.current_location_id,
                    "to_location_id": new_loc_id,
                },
            )
            session.store.append(move_evt)
            session.world = apply_event(world, move_evt)

            # Removed manual journal entry logic to allow LLM to handle it

            # Auto-switch NPC to someone in the new location if current is gone
            new_npcs = [
                n.id
                for n in session.world.npcs.values()
                if n.location_id == new_loc_id and n.alive
            ]
            if session.active_npc_id not in new_npcs and new_npcs:
                session.active_npc_id = new_npcs[0]

            return {
                "output": f"You have moved to {session.world.locations[new_loc_id].name}.",
                "command": "/move",
                "npc_id": "narrator",
                "npc_name": "Narrator",
            }

        elif verb == "/npc":
            if len(parts) < 2:
                return {"output": "Usage: /npc <npc_id>", "command": "/npc"}
            new_id = parts[1].strip()
            if new_id not in world.npcs:
                return {
                    "output": f"Unknown NPC id: {new_id}",
                    "command": "/npc",
                }
            npc = world.npcs[new_id]
            if npc.location_id != world.player.current_location_id:
                return {
                    "output": f"{npc.name} is not in this location.",
                    "command": "/npc",
                }
            session.active_npc_id = new_id
            return {
                "output": f"Now talking to: {npc.name}",
                "command": "/npc",
            }

        elif verb == "/help":
            output = (
                "Commands:\n"
                "  /look   — describe current location\n"
                "  /inv    — show inventory\n"
                "  /where  — show current location\n"
                "  /npcs   — list NPCs in this location\n"
                "  /npc <id> — switch active NPC\n"
                "  /help   — this message"
            )
            return {"output": output, "command": "/help"}

        return {"output": f"Unknown command: {verb}", "command": verb}

    @property
    def active_session_count(self) -> int:
        return len(self._sessions)

    def ping_llm(self) -> bool:
        if self._client:
            return self._client.ping()
        return False

    async def shutdown(self):
        """Close all sessions on server shutdown."""
        for sid in list(self._sessions.keys()):
            self.destroy_session(sid)
        if self._embedder:
            self._embedder.close()
        log.info("Session manager shut down.")
