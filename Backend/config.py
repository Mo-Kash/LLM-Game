"""Central configuration — all tunables in one place."""

from pathlib import Path
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# ── Paths ──────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

DB_PATH = DATA_DIR / "events.db"
FAISS_INDEX_PATH = DATA_DIR / "faiss.index"
FAISS_META_PATH = DATA_DIR / "faiss_meta.json"
SNAPSHOT_PATH = DATA_DIR / "snapshot.json"
WORLD_SEED_PATH = BASE_DIR / "game" / "world_seed.json"
EMBED_CACHE_PATH = DATA_DIR / "embed_cache.db"

# ── Cerebras LLM ─────────────────────────────────────────────────────────────
CEREBRAS_API_KEY = os.getenv("CEREBRAS_API_KEY", "your_cerebras_api_key_here")
MODEL_NAME = "gpt-oss-120b"

TEMPERATURE = 0.35
MAX_GENERATION_TOKENS = 512
REQUEST_TIMEOUT = 60  # seconds

# ── Embedding ──────────────────────────────────────────────────────────────
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_DIM = 384

# ── Memory ─────────────────────────────────────────────────────────────────
MAX_SHORT_TERM_TURNS = 8  # turns injected verbatim
TOP_K_RETRIEVAL = 4  # FAISS neighbours
SNAPSHOT_INTERVAL = 20  # persist snapshot every N turns
MEMORY_PRUNE_THRESHOLD = 200  # FAISS entries before pruning oldest

# ── Prompt / Context ───────────────────────────────────────────────────────
MAX_CONTEXT_CHARS = 6000  # rough guard before tokenisation

# ── API Server ─────────────────────────────────────────────────────────────
import os

API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:8080")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", FRONTEND_URL).split(",")
SESSION_SECRET = os.getenv("SESSION_SECRET", "dev-secret-change-in-production")
WS_HEARTBEAT_INTERVAL = 30  # seconds
MAX_CONCURRENT_SESSIONS = 50
