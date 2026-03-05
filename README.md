# LLM Game - NPC Engine

An ontology-aware RAG dialogue system that powers an interactive RPG game with AI-driven NPCs. The project combines a sophisticated backend game engine with a modern React frontend to create an immersive conversational experience.

## Tech Stack

### Backend

- **Python 3.8+**: Core runtime environment
- **FastAPI**: REST API server with automatic OpenAPI documentation
- **Uvicorn**: ASGI server for production deployment
- **SQLite**: Event sourcing database for persistent game state
- **LangGraph**: Orchestration framework for AI pipeline
- **LangChain Core**: LLM integration utilities
- **Cerebras Cloud SDK**: LLM API client for AI responses
- **FAISS**: Vector database for semantic memory retrieval
- **Sentence Transformers**: Text embedding models
- **PyTorch**: Deep learning framework for embeddings
- **Pydantic**: Data validation and serialization
- **WebSockets**: Real-time bidirectional communication

### Frontend

- **React 18**: Modern UI framework with hooks
- **TypeScript**: Type-safe JavaScript development
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Accessible component primitives
- **shadcn/ui**: High-quality component library
- **Framer Motion**: Animation and gesture library
- **Zustand**: Lightweight state management
- **React Query**: Server state synchronization
- **React Router DOM**: Client-side routing
- **React Hook Form**: Form validation and management

## Architecture Overview

### Backend Architecture

The backend follows an event-driven architecture with clear separation of concerns:

#### Core Systems

- **Event Store**: Append-only log of all game events using SQLite
- **State Reducer**: Rebuilds world state from event streams
- **Snapshot System**: Periodic state saves for fast recovery
- **Session Manager**: Multi-user game session handling

#### AI Pipeline

- **Memory System**: Short-term and long-term memory with FAISS indexing
- **Embedding Engine**: Text vectorization for semantic search
- **LLM Client**: Cerebras integration for intelligent responses
- **Prompt Builder**: Context-aware prompt construction
- **Graph Orchestration**: LangGraph pipeline for turn processing

#### Game Systems

- **World Loader**: JSON-based world configuration
- **NPC Engine**: AI-driven character behaviors
- **Object System**: Interactive item management
- **Relationship Tracker**: Trust and reputation mechanics
- **Validator**: Event validation and error handling

### Frontend Architecture

The frontend uses a modern React architecture with centralized state management:

#### State Management

- **Zustand Store**: Client-side game state
- **React Query**: Server state synchronization
- **WebSocket Integration**: Real-time updates
- **Local Storage**: User preferences persistence

#### Component Structure

- **Layout Components**: Game interface structure
- **Game Components**: Core gameplay UI
- **UI Components**: Reusable interface elements
- **Page Components**: Route-level views

#### Services

- **API Client**: Backend communication
- **WebSocket Service**: Real-time messaging
- **Type Definitions**: Comprehensive TypeScript types

## Feature List

### Backend Features

#### Core Game Engine

- Event-driven engine with real-time state synchronization
- Event-driven architecture with SQLite persistence
- State management through event sourcing
- Snapshot system for fast state recovery
- Multi-user session support

#### AI & Memory Systems

- LLM integration via Cerebras Cloud SDK
- FAISS vector database for semantic memory retrieval
- Short-term memory for recent conversation context
- Sentence transformer embeddings for text vectorization
- Knowledge graph system for NPC information

#### Game Mechanics

- Natural language dialogue system with NPCs
- Relationship tracking (trust/reputation)
- Location-based navigation system
- Inventory management with item pickup/drop
- Command system with slash commands
- Event validation and error handling

#### API & Networking

- RESTful API with comprehensive endpoints
- WebSocket support for real-time gameplay
- Session management for multiple users
- CORS support for frontend integration
- Health monitoring endpoints

### Frontend Features

#### User Interface

- Modern React application with TypeScript
- Responsive design with Tailwind CSS
- Component library with Radix UI primitives
- Theme support (dark/light modes)
- Smooth animations with Framer Motion

#### Game Interface

- Real-time dialogue display with message bubbles
- Location information and navigation sidebar
- Interactive command input with suggestions
- NPC information panels with relationship status
- Inventory management interface

#### Navigation & Pages

- Main menu with game entry points
- New game setup and session initialization
- World map for location exploration
- Character page with stats and inventory
- NPCs directory with relationship tracking
- Journal system for story progress
- Session management interface

#### Technical Features

- Full TypeScript implementation for type safety
- Comprehensive testing setup with Vitest
- Hot reload development server
- Code quality tools (ESLint, Prettier)
- Build optimization with Vite

## Core Concepts

### Event Sourcing

The game uses event sourcing as its primary state management pattern. Every action in the game is recorded as an immutable event in an append-only log. The current world state is always derived by replaying these events from the beginning of time.

### Memory Architecture

The AI system employs a dual-memory architecture:

- **Short-term memory**: Maintains recent conversation turns (last 8 turns)
- **Long-term memory**: Uses FAISS vector database for semantic retrieval of historical interactions

### NPC Intelligence

NPCs are powered by a sophisticated AI pipeline:

1. Context gathering from world state and memory
2. Semantic retrieval of relevant past interactions
3. Prompt construction with current context
4. LLM generation of responses
5. Event validation and state updates

### Relationship System

Each NPC maintains a trust score with the player (-100 to +100). Actions and dialogue choices affect these scores, which influence NPC behavior and dialogue options.

### World Structure

The game world consists of interconnected locations, each containing:

- NPCs with unique personalities and knowledge
- Interactive objects with properties
- State information that can change based on events

## Installation & Setup

### Prerequisites

- Python 3.8 or higher
- Node.js 18 or higher
- npm or yarn package manager
- Cerebras API key (for LLM functionality)

### Backend Setup

1. **Clone the repository**

```bash
git clone <repository-url>
cd "LLM Game"
```

2. **Create virtual environment**

```bash
cd Backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

3. **Install dependencies**

```bash
pip install -r requirements.txt
```

4. **Configure environment**

```bash
cp .env.example .env
# Edit .env with your Cerebras API key and other settings
```

5. **Initialize database**

```bash
python server.py --reset  # This creates the initial database and world state
```

### Frontend Setup

1. **Navigate to frontend directory**

```bash
cd Frontend
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables** (if needed)
   Create a `.env` file in the Frontend directory:

```
VITE_API_URL=http://localhost:8000
```

## Running the Application

### Development Mode

#### Backend

```bash
cd Backend
python server.py --reload --debug
```

The API server will start on `http://localhost:8000`

#### Frontend

```bash
cd Frontend
npm run dev
```

The frontend will start on `http://localhost:5173`

### Production Mode

#### Backend

```bash
cd Backend
python server.py --host 0.0.0.0 --port 8000
```

#### Frontend

```bash
cd Frontend
npm run build
npm run preview
```

## API Documentation

Once the backend is running, comprehensive API documentation is available at:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Key Endpoints

#### Game Sessions

- `POST /api/game/sessions` - Create new game session
- `GET /api/game/sessions/{id}` - Get session state
- `DELETE /api/game/sessions/{id}` - Delete session

#### Gameplay

- `POST /api/game/sessions/{id}/action` - Submit player action
- `GET /api/game/sessions/{id}/state` - Get current game state
- `GET /api/game/sessions/{id}/npcs` - List NPCs in current location
- `GET /api/game/sessions/{id}/locations` - List all locations

#### WebSocket

- `ws://localhost:8000/ws/{session_id}` - Real-time gameplay updates

## Configuration

### Backend Configuration (.env)

```env
CEREBRAS_API_KEY=your_api_key_here
API_HOST=0.0.0.0
API_PORT=8000
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173
```

### Key Backend Settings (config.py)

- `MODEL_NAME`: LLM model to use (default: "gpt-oss-120b")
- `EMBEDDING_MODEL`: Sentence transformer model
- `MAX_SHORT_TERM_TURNS`: Short-term memory window
- `TOP_K_RETRIEVAL`: Number of memories to retrieve
- `SNAPSHOT_INTERVAL`: Turns between state snapshots

## Game World Configuration

The game world is defined in `Backend/game/world_seed.json`. This file contains:

- Location definitions with descriptions and connections
- NPC definitions with personalities, knowledge, and secrets
- Object definitions with properties and locations
- Initial player state

### Adding New Content

#### New Location

```json
{
	"locations": {
		"new_location": {
			"id": "new_location",
			"name": "New Location Name",
			"description": "Description of the location",
			"connected_to": ["existing_location"],
			"state": {}
		}
	}
}
```

#### New NPC

```json
{
	"npcs": {
		"new_npc": {
			"id": "new_npc",
			"name": "NPC Name",
			"location_id": "tavern_common",
			"description": "Physical description",
			"personality": "Personality traits",
			"knowledge": ["Known facts"],
			"secrets": ["Hidden information"],
			"alive": true
		}
	}
}
```

## Development Guide

### Adding New Features

#### Backend

1. Define new event types in `schemas/events.py`
2. Add validation logic in `game/validator.py`
3. Update the graph pipeline in `graph/definition.py`
4. Add API endpoints in `api/routes.py`

#### Frontend

1. Define TypeScript types in `types/game.ts`
2. Update API client in `services/api.ts`
3. Add components in `components/`
4. Update store in `stores/gameStore.ts`

### Testing

#### Backend Tests

```bash
cd Backend
python -m pytest tests/
```

#### Frontend Tests

```bash
cd Frontend
npm run test
```

### Code Style

- Backend: Black formatter, PEP 8 compliance
- Frontend: Prettier with ESLint configuration
- Both: Comprehensive type checking

## Troubleshooting

### Common Issues

#### Backend

- **Import errors**: Ensure virtual environment is activated
- **Database errors**: Run `python server.py --reset` to reinitialize
- **API key errors**: Verify Cerebras API key in `.env`
- **Port conflicts**: Change API_PORT in configuration

#### Frontend

- **Build errors**: Check Node.js version compatibility
- **API connection**: Verify backend is running and CORS settings
- **Type errors**: Ensure TypeScript configuration is correct

### Debug Mode

Enable debug logging:

```bash
# Backend
python server.py --debug

# Frontend
npm run dev  # Includes source maps and detailed errors
```

## Performance Considerations

### Backend Optimization

- Event sourcing provides natural audit trails but requires replay for state reconstruction
- Snapshot system mitigates replay time for long-running sessions
- FAISS index enables fast semantic search at scale
- Connection pooling for database operations

### Frontend Optimization

- React Query provides intelligent caching and background updates
- WebSocket reduces polling overhead
- Component memoization prevents unnecessary re-renders
- Lazy loading for large component trees
