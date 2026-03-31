# The Obsidian Flask

## AI-Powered Narrative Game Engine with Persistent NPC Memory and RAG Architecture

**Full-Stack Software Engineering Project | Python | React | TypeScript | FastAPI | LLM Integration | Vector Search**

Production-grade narrative game engine featuring AI-driven NPCs with long-term memory, Retrieval-Augmented Generation (RAG) architecture, and real-time dialogue processing. Players engage in meaningful conversations with non-player characters that remember past interactions, form opinions based on trust, and respond with contextually-aware dialogue powered by large language models.

---

## Technical Skills and Technologies

**Backend Development:** Python 3.11, FastAPI, Pydantic, SQLite, REST API Design, WebSocket Implementation, Async/Await Programming

**Artificial Intelligence and Machine Learning:** Large Language Models (LLM), LangGraph, Groq API, Retrieval-Augmented Generation (RAG), Vector Embeddings, Sentence Transformers, FAISS Vector Search, Prompt Engineering

**Frontend Development:** React 18, TypeScript 5, Vite, Tailwind CSS, Zustand State Management, React Router, TanStack Query

**DevOps and Infrastructure:** Docker, Docker Compose, Uvicorn ASGI Server, Git Version Control, PowerShell Automation

**Software Architecture:** Event Sourcing, CQRS Pattern, Domain-Driven Design, Microservices-Ready Architecture, Real-Time Communication

---

## Key Achievements and Impact

- Architected and implemented a deterministic 7-stage LLM processing pipeline using LangGraph with compile-time validation and type-safe graph execution
- Designed and deployed a dual-tier memory system (8-turn short-term context + FAISS vector retrieval) enabling NPCs to recall relevant conversations from up to 1000 past interactions using 384-dimensional semantic embeddings
- Built event-sourced persistence layer with SQLite, maintaining 100% immutable audit trail coverage of all game actions for debugging and replay capabilities
- Implemented WebSocket real-time communication supporting up to 50 concurrent game sessions with automatic connection lifecycle management
- Developed 25+ REST API endpoints with automatic OpenAPI documentation generated from Pydantic models
- Configured robust error handling with exponential backoff retry logic (3 attempts) for LLM API failures
- Reduced LLM context window usage through RAG architecture by selecting only 6 most relevant memories instead of full conversation history

---

## What Makes This Project Stand Out

**For Players**: Traditional games rely on scripted dialogue trees. The Obsidian Flask breaks that mold. NPCs understand natural language, remember what you told them yesterday, and their attitude evolves based on your choices. The trust system means treating a character poorly in Act One might close doors in Act Three.

**For Developers**: This is a production-ready system demonstrating Event Sourcing Architecture, Retrieval-Augmented Generation (RAG) with FAISS vector search, deterministic LLM orchestration via LangGraph, and real-time WebSocket communication.

---

## Core Concepts and Features

### Dynamic NPC Relationship System

NPCs maintain persistent trust scores toward the player that evolve based on dialogue choices and actions. Trust thresholds unlock relationship tiers (Stranger, Acquaintance, Confidant) and emotional states (Guarded, Neutral, Trusting, Hostile). This is not cosmetic. High-trust NPCs share information they would withhold from strangers. Hostile NPCs may refuse to cooperate entirely.

### Retrieval-Augmented Generation (RAG) Architecture

The Obsidian Flask implements a complete RAG (Retrieval-Augmented Generation) system to ground LLM responses in the game's actual history:

**What is RAG?**

Retrieval-Augmented Generation is an AI architecture pattern that enhances large language model outputs by retrieving relevant information from a knowledge base and injecting it into the prompt context. Instead of relying solely on the model's training data, RAG grounds responses in specific, retrieved facts.

**How This Project Implements RAG:**

1. **Document Chunking and Embedding**: Every player-NPC interaction is converted to a text summary and embedded into a 384-dimensional vector using the all-MiniLM-L12-v2 sentence transformer model

2. **Vector Storage**: Embeddings are stored in FAISS (Facebook AI Similarity Search), an efficient vector database optimized for nearest-neighbor search

3. **Query Processing**: When a player speaks, their input is embedded and used to query FAISS for the 6 most semantically similar past memories

4. **Context Injection**: Retrieved memories are injected into the LLM prompt alongside short-term conversation history, grounding the model's response in actual game events

5. **Filtering and Ranking**: Results are filtered by current location and active NPC, with automatic fallback to broader search when insufficient results are found

This RAG architecture solves the "context window" problem by selecting only the most relevant historical context rather than sending the entire game history to the LLM, significantly reducing token consumption while improving response quality.

### Two-Tier Memory System

NPC memory operates on two levels:

**Short-Term (Verbatim)**: The last 8 dialogue turns are injected directly into every LLM prompt for immediate conversational context.

**Long-Term (Semantic)**: All past interactions are embedded as 384-dimensional vectors and stored in FAISS. When a player speaks, the system retrieves the 6 most semantically similar memories, filtered by current location and active NPC. Results automatically fall back to broader search when insufficient matches are found.

### Event Sourcing and State Management

Every action creates an event. Events are append-only and immutable. The game world state is derived by applying a reducer function to the event log. This pattern enables:

- Complete audit trails of every game action
- Debugging by replaying specific turns
- Snapshots for fast loading without replaying entire history
- Schema migration through event versioning

### World State Reducer

A pure function applies events to the current world state, producing a new state. Events include player movement, object pickup/drop, NPC speech, clue discovery, trust changes, and moral alignment shifts. The reducer pattern ensures predictable, testable state transitions.

### LangGraph Execution Pipeline

Each player action flows through a deterministic pipeline:

1. **Input Validation**: Sanitize and normalize player input
2. **Memory Retrieval**: Query FAISS for relevant past interactions (RAG retrieval step)
3. **Prompt Assembly**: Construct structured prompt with world state, retrieved memories (RAG context), and history
4. **LLM Generation**: Call Groq API with configurable temperature and token limits
5. **JSON Extraction**: Parse structured response from LLM output with fallback handling
6. **World Validation**: Validate proposed state changes against game rules
7. **Event Commit**: Persist events, update memory indexes, create snapshots

### Session Persistence and Auto-Save

Game sessions are automatically saved every 16 turns. Players can manually save at any time. The session manager handles concurrent sessions with a configurable maximum limit. Sessions can be listed, loaded, and destroyed through the REST API.

### WebSocket Real-Time Updates

During gameplay, the backend maintains persistent WebSocket connections to push updates immediately. When an NPC responds, all connected clients receive the update simultaneously. This architecture supports potential multiplayer extensions.

---

## Complete Technology Stack

### Backend

| Technology                | Purpose            | Selection Rationale                                                         |
| ------------------------- | ------------------ | --------------------------------------------------------------------------- |
| **Python 3.11+**          | Primary language   | Type hints, async/await, modern standard library                            |
| **FastAPI**               | Web framework      | High performance, automatic OpenAPI docs, dependency injection              |
| **LangGraph**             | LLM orchestration  | Deterministic state machines for AI workflows, type-safe graphs             |
| **Groq**                  | LLM provider       | Fast inference, competitive pricing, OpenAI-compatible API                  |
| **Pydantic v2**           | Data validation    | Runtime validation, serialization, OpenAPI schema generation                |
| **SQLite**                | Event store        | Serverless, zero-configuration, ACID guarantees                             |
| **FAISS (CPU)**           | Vector search      | Facebook AI Similarity Search, efficient nearest neighbor retrieval for RAG |
| **Sentence Transformers** | Text embeddings    | all-MiniLM-L12-v2 for 384-dim semantic vectors                              |
| **Uvicorn**               | ASGI server        | High-performance async server with HTTP/2 support                           |
| **WebSockets**            | Real-time protocol | Bidirectional communication for live gameplay                               |
| **Docker**                | Containerization   | Reproducible deployments, isolated dependencies                             |

### Frontend

| Technology          | Purpose           | Selection Rationale                                           |
| ------------------- | ----------------- | ------------------------------------------------------------- |
| **React 18**        | UI library        | Component-based architecture, concurrent features             |
| **TypeScript 5**    | Type safety       | Compile-time error catching, IDE support                      |
| **Vite**            | Build tool        | Fast HMR, optimized production builds, ES modules             |
| **Tailwind CSS 3**  | Styling           | Utility-first, design system consistency                      |
| **shadcn/ui**       | Component library | Radix primitives + Tailwind, accessible by default            |
| **Zustand**         | State management  | Minimal boilerplate, TypeScript-friendly, no providers needed |
| **React Router v6** | Navigation        | Declarative routing, nested layouts, data loaders             |
| **TanStack Query**  | Server state      | Caching, synchronization, background updates                  |
| **Framer Motion**   | Animations        | Declarative animations, gesture support                       |
| **Lucide React**    | Icon system       | Consistent icon set, tree-shakeable                           |

### Development and DevOps

| Tool                  | Purpose                          |
| --------------------- | -------------------------------- |
| **ESLint + Prettier** | Code quality and formatting      |
| **Vitest**            | Frontend unit testing            |
| **PowerShell**        | Development automation (Windows) |
| **Docker Compose**    | Multi-container orchestration    |
| **Git**               | Version control                  |

---

## System Architecture

```
FRONTEND (React + TypeScript)
+-----------------------------+
|  Main Menu   |  Game Page   |
|  NPCs Page   |  World View  |
|  Journal     |  Session Mgr |
+-----------------------------+
            |
            | HTTP / WebSocket
            v
BACKEND (FastAPI)
+-----------------------------+
|  REST API    |  WebSocket   |
|  Routes      |  Handler     |
+-----------------------------+
            |
            v
LANGGRAPH PIPELINE
+-----------------------------+
| Input -> Retrieval ->       |
| Prompt Assembly -> LLM ->   |
| Parse -> Validate -> Commit |
+-----------------------------+
            |
    +-------+-------+--------+
    |       |       |        |
    v       v       v        v
+-------+ +-------+ +-------+ +----------+
| FAISS | |Short  | | Groq  | | SQLite   |
|Memory | |Term   | | LLM   | | Event    |
|       | |Memory | |       | | Store    |
+-------+ +-------+ +-------+ +----------+
```

---

## API Reference

### Session Management

- `POST /api/game/session` - Create session with character customization
- `GET /api/game/sessions` - List all saved sessions
- `POST /api/game/load/{id}` - Restore session from disk
- `POST /api/game/save/{id}` - Manual state persistence
- `DELETE /api/game/session/{id}` - Clean up session

### Game State

- `GET /api/game/state/{id}` - Full world state, relationships, journal
- `GET /api/game/npcs/{id}` - NPCs in current location with trust scores
- `POST /api/game/npc/{id}/{npc}` - Switch conversation target
- `GET /api/game/locations/{id}` - All locations with occupants

### Gameplay Actions

- `POST /api/game/action/{id}` - Submit dialogue or command
- `POST /api/game/move/{id}` - Travel between connected locations
- `POST /api/game/pickup/{id}/{obj}` - Add object to inventory
- `POST /api/game/drop/{id}/{obj}` - Remove object from inventory
- `POST /api/game/clue/link/{id}` - Connect related clues

### Real-Time

- `WS /ws/game/{id}` - WebSocket for live updates

---

## Getting Started

### Prerequisites

- Python 3.11 or higher
- Node.js 20 or higher
- Groq API key (free tier available)

### Quick Start (Windows)

```powershell
# 1. Clone and enter directory
git clone <repository-url>
cd LLM-Game

# 2. Configure environment
$env:GROQ_API_KEY = "your-api-key"
$env:SESSION_SECRET = "random-secret-string"

# 3. Install dependencies
python -m venv .venv
.venv\Scripts\activate
pip install -r Backend/requirements.txt
cd Frontend; npm install; cd ..

# 4. Launch everything
.\start.ps1
```

---

## Development Roadmap

**Completed**

- Event sourcing with SQLite persistence
- FAISS-based vector memory retrieval with RAG architecture
- LangGraph orchestration pipeline
- WebSocket real-time updates
- Full CRUD session management
- Trust-based relationship system
- Clue linking mechanic
- Docker containerization

**In Progress**

- Mobile-responsive UI improvements
- Additional LLM provider support (Anthropic, OpenAI)

**Planned**

- Multiplayer session support
- Admin dashboard for world authoring
- Save file import/export
- Voice input/output integration
- Combat and action resolution system

---

## Why This Architecture Matters

Most LLM applications treat the language model as a black box with unpredictable outputs. The Obsidian Flask takes a disciplined engineering approach:

**Deterministic Workflows**: LangGraph provides compile-time validation of the processing pipeline. Every player action follows the exact same execution path.

**Retrieval-Augmented Generation**: The RAG architecture grounds LLM responses in actual game history rather than hallucinated content, significantly improving accuracy and player immersion.

**Testable State Management**: The event sourcing pattern makes game logic testable. Write unit tests that create events, apply the reducer, and assert on resulting state.

**Observability**: Structured logging at every pipeline stage. Know exactly what the LLM received and returned for any turn.

**Scalability**: Stateless API design with session data persisted to disk. Horizontal scaling is possible with shared storage.

**Resilience**: Retry logic with exponential backoff for LLM failures. Graceful degradation when services are unavailable.

**Cost Optimization**: RAG reduces LLM context window usage by selecting only relevant memories instead of full conversation history, significantly cutting API costs.
