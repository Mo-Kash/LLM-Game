"""Assembles the single unified prompt per turn."""

from __future__ import annotations
import json
from typing import List, Optional

from schemas.world_state import WorldState, NPC
from memory.faiss_index import MemoryEntry

# ── Template ───────────────────────────────────────────────────────────────

SYSTEM_BLOCK = """You are the narrator and NPC voice engine for a text adventure game.
You control ONE NPC per turn. You must respond with a single valid JSON object — no markdown, no prose outside the JSON.

OUTPUT SCHEMA (strict):
{{
  "world_updates": [
    {{"type": "<EventType>", "payload": {{...}}}}
  ],
  "memory_summary": "<one short sentence summarising what just happened>",
  "new_entities": [],
  "rule_flags": [],
  "narration": "<Physical actions, setting descriptions, and character observations. NO character speech here.>",
  "npc_response": "<The actual spoken words from the NPC. NO descriptive text or narration here. Leave empty if they don't speak.>"
}}

CRITICAL: NEVER mix narration and dialogue. 
- Narration: "He sighs and looks at the floor."
- Dialogue: "I suppose I can help you."
- BAD: "He sighs and says, 'I suppose I can help you.'" (This belongs in two fields)

ALLOWED EventTypes and their payload fields:
  RELATIONSHIP_CHANGED  → {{"npc_id":"...", "target_id":"player", "delta":<int -10..10>}}
  PLAYER_MOVED          → {{"from_location_id":"...", "to_location_id":"..."}}
  OBJECT_TAKEN          → {{"object_id":"...", "taken_by":"player"}}
  OBJECT_DROPPED        → {{"object_id":"...", "dropped_by":"player", "location_id":"..."}}
  LOCATION_STATE_CHANGED→ {{"location_id":"...", "key":"...", "value":...}}
  NPC_STATE_CHANGED     → {{"npc_id":"...", "key":"alive|location_id", "value":...}}
  PLAYER_FLAG_SET       → {{"key":"...", "value":...}}
  JOURNAL_ENTRY_CREATED → {{"content":"<one-sentence summary of a significant event>"}}
  NPC_SPOKE             → {{}}

HARD RULES:
- new_entities MUST always []. Never invent entities.
- Do NOT contradict canonical facts listed below.
- Do NOT override canonical entity fields (names, ids, descriptions).
- If you are uncertain, have the NPC express uncertainty in-character.
- You MUST heavily tailor the NPC's response and attitude based on the PLAYER IDENTITY (Age, Gender, Occupation). Respond differently to a noble vs a thug.
- Output ONLY the JSON object. No commentary.

NPC BEHAVIOR GUIDELINES:
- **Avoid Repetition**: Never repeat the same response, questions, or descriptions from the 'RECENT DIALOGUE' block.
- **Natural Progression**: If the player is generic or repetitive, have the NPC react naturally (get bored, annoyed, or inquisitive) instead of repeating the same greeting.
- **Show, Don't Tell**: Use 'narration' for physical cues (eye contact, posture) and 'npc_response' ONLY for words.
"""

WORLD_BLOCK = """=== CANONICAL WORLD STATE ===
Location: {location_name} — {location_description}
NPCs present: {npcs_present}
Objects here: {objects_here}
Player inventory: {player_inventory}
Active NPC: {npc_name} ({npc_id})
NPC personality: {npc_personality}
NPC knowledge: {npc_knowledge}
NPC state (mood, suspcion, etc): {npc_state}
Relationship (NPC→player trust): {trust}
World rules: {world_rules}
"""

MEMORY_BLOCK = """=== RETRIEVED MEMORIES (most relevant) ===
{memories}
"""

HISTORY_BLOCK = """=== RECENT DIALOGUE ===
{history}
"""

PLAYER_BLOCK = """=== PLAYER IDENTITY ===
Name: {player_name}
Gender: {player_gender}
Age: {player_age}
Occupation: {player_occupation}
"""

QUERY_BLOCK = """=== CURRENT TURN {turn} ===
Player says: \"{player_input}\"

Respond as {npc_name}. Output JSON only."""


def build_prompt(
    world: WorldState,
    active_npc_id: str,
    player_input: str,
    memories: List[MemoryEntry],
    history: str,
    max_chars: int = 6000,
) -> str:
    loc_id = world.player.current_location_id
    location = world.locations.get(loc_id)
    npc = world.npcs.get(active_npc_id)

    if not location:
        raise ValueError(f"Invalid loc={loc_id}")

    if not npc and active_npc_id != "narrator":
        raise ValueError(f"Invalid npc={active_npc_id}")

    # NPCs in current location
    npcs_present = [
        f"{n.name} ({n.id})"
        for n in world.npcs.values()
        if n.location_id == loc_id and n.alive
    ]

    # Objects in current location
    objects_here = [
        f"{o.name} ({o.id})" for o in world.objects.values() if o.location_id == loc_id
    ]

    # Player inventory
    inventory = [
        world.objects[oid].name
        for oid in world.player.inventory
        if oid in world.objects
    ]

    if active_npc_id == "narrator":
        npc_name = "Narrator"
        npc_id = "narrator"
        npc_personality = "Omniscient narrator"
        npc_knowledge = "Everything"
        npc_state = "{}"
        trust = 0
    else:
        npc_name = npc.name
        npc_id = npc.id
        npc_personality = npc.personality
        npc_knowledge = "; ".join(npc.knowledge) or "general"
        npc_state = (
            json.dumps(npc.state) if hasattr(npc, "state") and npc.state else "{}"
        )
        trust = world.relationships.get(active_npc_id, {}).get("player", 0)

    # Memories text
    if memories:
        mem_lines = "\n".join(f"- {m.text}" for m in memories)
    else:
        mem_lines = "(none retrieved)"

    world_section = WORLD_BLOCK.format(
        location_name=location.name,
        location_description=location.description,
        npcs_present=", ".join(npcs_present) or "none",
        objects_here=", ".join(objects_here) or "none",
        player_inventory=", ".join(inventory) or "empty",
        npc_name=npc_name,
        npc_id=npc_id,
        npc_personality=npc_personality,
        npc_knowledge=npc_knowledge,
        npc_state=npc_state,
        trust=trust,
        world_rules="\n  ".join(world.rules) or "none",
    )

    player_section = PLAYER_BLOCK.format(
        player_name=world.player.name,
        player_gender=world.player.gender,
        player_age=world.player.age,
        player_occupation=world.player.occupation,
    )

    mem_section = MEMORY_BLOCK.format(memories=mem_lines)
    hist_section = HISTORY_BLOCK.format(history=history)
    query_section = QUERY_BLOCK.format(
        turn=world.turn + 1,
        player_input=player_input,
        npc_name=npc_name,
    )

    prompt = (
        SYSTEM_BLOCK
        + "\n"
        + world_section
        + player_section
        + mem_section
        + hist_section
        + query_section
    )

    # Trim to max_chars if needed (trim memories first)
    if len(prompt) > max_chars:
        mem_section = MEMORY_BLOCK.format(memories="(trimmed — context limit)")
        prompt = (
            SYSTEM_BLOCK
            + "\n"
            + world_section
            + mem_section
            + hist_section
            + query_section
        )

    if len(prompt) > max_chars:
        # Trim history
        hist_section = HISTORY_BLOCK.format(history="(trimmed)")
        prompt = (
            SYSTEM_BLOCK
            + "\n"
            + world_section
            + mem_section
            + hist_section
            + query_section
        )

    return prompt
