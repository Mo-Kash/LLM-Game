"""
REST + WebSocket routes for the NPC Engine API.

REST endpoints handle session lifecycle, state queries, and commands.
The WebSocket endpoint provides real-time streaming during gameplay.
"""

from __future__ import annotations
import asyncio
import json
import logging
import time
from typing import Optional, List

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Query

from api.schemas import (
    CreateSessionRequest,
    PlayerActionRequest,
    SwitchNPCRequest,
    SessionInfo,
    GameStateResponse,
    ActionResponse,
    NPCListResponse,
    NPCInfo,
    LocationInfo,
    ObjectInfo,
    PlayerInfo,
    CommandResponse,
    ErrorResponse,
    SaveInfo,
    HealthResponse,
    WSOutMessage,
)
from api.session_manager import SessionManager

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/game", tags=["game"])
ws_router = APIRouter(tags=["websocket"])

# Shared session manager — injected at app startup
_sm: Optional[SessionManager] = None


def set_session_manager(sm: SessionManager):
    global _sm
    _sm = sm


def _get_sm() -> SessionManager:
    if _sm is None:
        raise HTTPException(500, "Server not initialised")
    return _sm


# ── Helpers ────────────────────────────────────────────────────────────────


def _build_npc_info(session, npc) -> NPCInfo:
    trust = session.world.relationships.get(npc.id, {}).get("player", 0)
    return NPCInfo(
        id=npc.id,
        name=npc.name,
        description=npc.description,
        personality=npc.personality,
        location_id=npc.location_id,
        alive=npc.alive,
        trust=trust,
    )


def _build_location_info(session) -> Optional[LocationInfo]:
    world = session.world
    loc = world.locations.get(world.player.current_location_id)
    if not loc:
        return None
    npcs_present = [
        _build_npc_info(session, n)
        for n in world.npcs.values()
        if n.location_id == loc.id and n.alive
    ]
    objects_here = [
        ObjectInfo(
            id=o.id,
            name=o.name,
            description=o.description,
            location_id=o.location_id,
            properties=o.properties,
        )
        for o in world.objects.values()
        if o.location_id == loc.id
    ]
    return LocationInfo(
        id=loc.id,
        name=loc.name,
        description=loc.description,
        connected_to=loc.connected_to,
        npcs_present=npcs_present,
        objects_here=objects_here,
        state=loc.state,
    )


def _build_player_info(session) -> PlayerInfo:
    world = session.world
    inventory = [
        ObjectInfo(
            id=world.objects[oid].id,
            name=world.objects[oid].name,
            description=world.objects[oid].description,
            location_id=world.objects[oid].location_id,
            properties=world.objects[oid].properties,
        )
        for oid in world.player.inventory
        if oid in world.objects
    ]
    return PlayerInfo(
        current_location_id=world.player.current_location_id,
        inventory=inventory,
        flags=world.player.flags,
    )


# ── Session Endpoints ─────────────────────────────────────────────────────


@router.post("/session", response_model=SessionInfo)
async def create_session(req: CreateSessionRequest):
    """Create a new game session."""
    sm = _get_sm()
    try:
        session = await sm.create_session(
            name=req.name,
            gender=req.gender,
            age=req.age,
            occupation=req.occupation,
            default_npc_id=req.default_npc_id,
            reset=req.reset,
        )
    except RuntimeError as e:
        raise HTTPException(429, str(e))

    return SessionInfo(
        session_id=session.session_id,
        player_name=session.world.player.name,
        turn=session.world.turn,
        active_npc_id=session.active_npc_id,
        current_location_id=session.world.player.current_location_id,
        created_at=session.created_at,
    )


@router.get("/sessions", response_model=List[SaveInfo])
async def list_sessions():
    """List all saved game sessions."""
    sm = _get_sm()
    sessions = await sm.list_sessions()
    return [SaveInfo(**s) for s in sessions]


@router.post("/load/{session_id}", response_model=SessionInfo)
async def load_session(session_id: str):
    """Load a specific session."""
    sm = _get_sm()
    session = await sm.load_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found or corrupt")
    return SessionInfo(
        session_id=session.session_id,
        player_name=session.world.player.name,
        turn=session.world.turn,
        active_npc_id=session.active_npc_id,
        current_location_id=session.world.player.current_location_id,
        created_at=session.created_at,
    )


@router.post("/save/{session_id}")
async def save_game(session_id: str):
    """Manually save game state."""
    sm = _get_sm()
    if not await sm.save_session(session_id):
        raise HTTPException(404, "Session not found")
    return {"status": "saved"}


@router.delete("/session/{session_id}")
async def destroy_session(session_id: str):
    """End and clean up a session."""
    sm = _get_sm()
    if not sm.destroy_session(session_id):
        raise HTTPException(404, "Session not found")
    return {"status": "destroyed", "session_id": session_id}


# ── State Endpoints ───────────────────────────────────────────────────────


@router.get("/state/{session_id}", response_model=GameStateResponse)
async def get_game_state(session_id: str):
    """Retrieve full game state for a session."""
    sm = _get_sm()
    session = sm.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")

    active_npc_obj = session.world.npcs.get(session.active_npc_id)
    active_npc = _build_npc_info(session, active_npc_obj) if active_npc_obj else None

    return GameStateResponse(
        session_id=session.session_id,
        turn=session.world.turn,
        active_npc_id=session.active_npc_id,
        active_npc=active_npc,
        location=_build_location_info(session),
        player=_build_player_info(session),
        relationships=session.world.relationships,
        journal=[
            {"id": e.id, "turn": e.turn, "content": e.content, "timestamp": e.timestamp}
            for e in session.world.journal
        ],
    )


# ── Action Endpoint ───────────────────────────────────────────────────────


@router.post("/action/{session_id}", response_model=ActionResponse)
async def submit_action(session_id: str, req: PlayerActionRequest):
    """Submit a player action (dialogue or command) and get the NPC response."""
    sm = _get_sm()
    session = sm.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")

    content = req.content.strip()

    # Handle slash commands locally
    if content.startswith("/"):
        cmd_result = sm.handle_command(session, content)
        return ActionResponse(
            npc_dialogue=cmd_result["output"],
            npc_id=cmd_result.get("npc_id", session.active_npc_id),
            npc_name=cmd_result.get("npc_name", "System"),
            turn=session.world.turn,
        )

    # Process through LangGraph pipeline
    try:
        result = await sm.process_action(session, content, req.npc_id)
    except Exception as e:
        log.error("Action error for session %s: %s", session_id, e, exc_info=True)
        raise HTTPException(500, f"Game engine error: {e}")

    npc_obj = session.world.npcs.get(result["npc_id"])
    npc_name = npc_obj.name if npc_obj else result["npc_id"]

    # Broadcast to WebSocket connections
    ws_msg = WSOutMessage(
        type="npc_response",
        payload={
            "npc_dialogue": result["npc_dialogue"],
            "npc_id": result["npc_id"],
            "npc_name": npc_name,
            "turn": result["turn"],
            "trust_change": result["trust_change"],
            "events": result["events"],
        },
        timestamp=time.time(),
    )
    await _broadcast_to_session(session, ws_msg)

    return ActionResponse(
        npc_dialogue=result["npc_dialogue"],
        npc_id=result["npc_id"],
        npc_name=npc_name,
        turn=result["turn"],
        trust_change=result["trust_change"],
        validation_errors=result["validation_errors"],
        elapsed_ms=result["elapsed_ms"],
        events=result["events"],
    )


# ── NPC Endpoints ─────────────────────────────────────────────────────────


@router.get("/npcs/{session_id}", response_model=NPCListResponse)
async def list_npcs(session_id: str, location_only: bool = Query(True)):
    """List NPCs. If location_only, only NPCs in current location."""
    sm = _get_sm()
    session = sm.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")

    world = session.world
    npcs = []
    for n in world.npcs.values():
        if location_only and n.location_id != world.player.current_location_id:
            continue
        if not n.alive:
            continue
        npcs.append(_build_npc_info(session, n))

    return NPCListResponse(npcs=npcs, active_npc_id=session.active_npc_id)


@router.post("/npc/{session_id}/{npc_id}")
async def switch_npc(session_id: str, npc_id: str):
    """Switch the active NPC for a session."""
    sm = _get_sm()
    session = sm.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")

    world = session.world
    if npc_id not in world.npcs:
        raise HTTPException(404, f"NPC '{npc_id}' not found")

    npc = world.npcs[npc_id]
    if npc.location_id != world.player.current_location_id:
        raise HTTPException(400, f"{npc.name} is not in this location")

    if not npc.alive:
        raise HTTPException(400, f"{npc.name} is no longer available")

    session.active_npc_id = npc_id
    npc_info = _build_npc_info(session, npc)

    # Broadcast NPC switch
    ws_msg = WSOutMessage(
        type="npc_switched",
        payload=npc_info.model_dump(),
        timestamp=time.time(),
    )
    await _broadcast_to_session(session, ws_msg)

    return {"status": "switched", "npc": npc_info.model_dump()}


# ── Location Endpoint ─────────────────────────────────────────────────────


@router.get("/location/{session_id}", response_model=LocationInfo)
async def get_location(session_id: str):
    """Get current location data."""
    sm = _get_sm()
    session = sm.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")

    loc_info = _build_location_info(session)
    if not loc_info:
        raise HTTPException(404, "Location not found")
    return loc_info


@router.get("/locations/{session_id}", response_model=List[LocationInfo])
async def list_locations(session_id: str):
    """List all locations in the world (for map/world view)."""
    sm = _get_sm()
    session = sm.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")

    return [
        LocationInfo(
            id=loc.id,
            name=loc.name,
            description=loc.description,
            connected_to=loc.connected_to,
            npcs_present=[
                _build_npc_info(session, n)
                for n in session.world.npcs.values()
                if n.location_id == loc.id and n.alive
            ],
            objects_here=[
                ObjectInfo(
                    id=o.id,
                    name=o.name,
                    description=o.description,
                    location_id=o.location_id,
                    properties=o.properties,
                )
                for o in session.world.objects.values()
                if o.location_id == loc.id
            ],
            state=loc.state,
        )
        for loc in session.world.locations.values()
    ]


# ── Health Check ──────────────────────────────────────────────────────────


@router.get("/health", response_model=HealthResponse)
async def health_check():
    sm = _get_sm()
    llm_ok = False
    try:
        llm_ok = sm.ping_llm()
    except Exception:
        pass
    return HealthResponse(
        status="ok",
        llm_reachable=llm_ok,
        active_sessions=sm.active_session_count,
    )


# ── WebSocket ─────────────────────────────────────────────────────────────


async def _broadcast_to_session(session, msg: WSOutMessage):
    """Send a message to all WebSocket connections for a session."""
    dead = set()
    data = msg.model_dump_json()
    for ws in session.ws_connections:
        try:
            await ws.send_text(data)
        except Exception:
            dead.add(ws)
    session.ws_connections -= dead


@ws_router.websocket("/ws/game/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """
    Real-time WebSocket for gameplay events.

    Incoming messages:
      - {"type": "action", "payload": {"content": "..."}}
      - {"type": "command", "payload": {"content": "/look"}}
      - {"type": "ping"}

    Outgoing messages:
      - {"type": "npc_response", "payload": {...}}
      - {"type": "state_update", "payload": {...}}
      - {"type": "npc_switched", "payload": {...}}
      - {"type": "error", "payload": {"message": "..."}}
      - {"type": "pong"}
    """
    sm = _get_sm()
    session = sm.get_session(session_id)
    if not session:
        await websocket.close(code=4004, reason="Session not found")
        return

    await websocket.accept()
    session.ws_connections.add(websocket)
    log.info("WS connected: session=%s", session_id)

    # Send initial state
    try:
        active_npc_obj = session.world.npcs.get(session.active_npc_id)
        init_msg = WSOutMessage(
            type="connected",
            payload={
                "session_id": session_id,
                "turn": session.world.turn,
                "active_npc_id": session.active_npc_id,
                "active_npc_name": active_npc_obj.name if active_npc_obj else "",
                "location": session.world.player.current_location_id,
            },
            timestamp=time.time(),
        )
        await websocket.send_text(init_msg.model_dump_json())
    except Exception as e:
        log.error("WS init error: %s", e)

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_text(
                    WSOutMessage(
                        type="error",
                        payload={"message": "Invalid JSON"},
                        timestamp=time.time(),
                    ).model_dump_json()
                )
                continue

            msg_type = msg.get("type", "")
            payload = msg.get("payload", {})

            if msg_type == "ping":
                await websocket.send_text(
                    WSOutMessage(
                        type="pong", payload={}, timestamp=time.time()
                    ).model_dump_json()
                )

            elif msg_type == "action":
                content = payload.get("content", "").strip()
                if not content:
                    continue

                # Handle commands
                if content.startswith("/"):
                    cmd_result = sm.handle_command(session, content)
                    await websocket.send_text(
                        WSOutMessage(
                            type="command_response",
                            payload=cmd_result,
                            timestamp=time.time(),
                        ).model_dump_json()
                    )
                else:
                    # Process action
                    try:
                        result = await sm.process_action(session, content)
                        npc_obj = session.world.npcs.get(result["npc_id"])
                        npc_name = npc_obj.name if npc_obj else result["npc_id"]

                        response_msg = WSOutMessage(
                            type="npc_response",
                            payload={
                                "npc_dialogue": result["npc_dialogue"],
                                "npc_id": result["npc_id"],
                                "npc_name": npc_name,
                                "turn": result["turn"],
                                "trust_change": result["trust_change"],
                                "validation_errors": result["validation_errors"],
                                "elapsed_ms": result["elapsed_ms"],
                                "events": result["events"],
                            },
                            timestamp=time.time(),
                        )
                        await _broadcast_to_session(session, response_msg)
                    except Exception as e:
                        log.error("WS action error: %s", e, exc_info=True)
                        await websocket.send_text(
                            WSOutMessage(
                                type="error",
                                payload={"message": str(e)},
                                timestamp=time.time(),
                            ).model_dump_json()
                        )

            elif msg_type == "command":
                content = payload.get("content", "").strip()
                if content:
                    cmd_result = sm.handle_command(session, content)
                    await websocket.send_text(
                        WSOutMessage(
                            type="command_response",
                            payload=cmd_result,
                            timestamp=time.time(),
                        ).model_dump_json()
                    )

    except WebSocketDisconnect:
        log.info("WS disconnected: session=%s", session_id)
    except Exception as e:
        log.error("WS error: %s", e, exc_info=True)
    finally:
        session.ws_connections.discard(websocket)
