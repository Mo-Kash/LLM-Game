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

# Session Filenames
EVENTS_DB_FILENAME = "events.db"
FAISS_INDEX_FILENAME = "faiss.index"
FAISS_META_FILENAME = "faiss_meta.json"
SNAPSHOT_FILENAME = "snapshot.json"
SNAPSHOT_AUTO_FILENAME = "snapshot_auto.json"
DIALOGUE_FILENAME = "dialogue.json"
DIALOGUE_AUTO_FILENAME = "dialogue_auto.json"

DB_PATH = DATA_DIR / EVENTS_DB_FILENAME
FAISS_INDEX_PATH = DATA_DIR / FAISS_INDEX_FILENAME
FAISS_META_PATH = DATA_DIR / FAISS_META_FILENAME
SNAPSHOT_PATH = DATA_DIR / SNAPSHOT_FILENAME
WORLD_SEED_PATH = BASE_DIR / "game" / "world_seed.json"
EMBED_CACHE_PATH = DATA_DIR / "embed_cache.db"

# ── Groq LLM ─────────────────────────────────────────────────────────────
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
MODEL_NAME = "openai/gpt-oss-120b"

TEMPERATURE = 0.35
MAX_GENERATION_TOKENS = 4096
REQUEST_TIMEOUT = 30  # seconds
LLM_MAX_RETRIES = 3
LLM_RETRY_BACKOFF = 1.0

# ── Embedding ──────────────────────────────────────────────────────────────
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_DIM = 384
EMBEDDING_WARMUP_TEXT = "warm up sentence"

# ── Memory ─────────────────────────────────────────────────────────────────
MAX_SHORT_TERM_TURNS = 8  # turns injected verbatim
TOP_K_RETRIEVAL = 6  # FAISS neighbours
FAISS_OVERFETCH_FACTOR = 5  # over-fetch for post-filter
SNAPSHOT_INTERVAL = 16  # persist snapshot every N turns
MEMORY_PRUNE_THRESHOLD = 1000  # FAISS entries before pruning oldest
MEMORY_PRUNE_KEEP_RATIO = 0.5  # ratio of entries to keep after pruning
RETRIEVAL_MIN_CANDIDATES = 3  # min results before retrying without filter

# ── Truncation ─────────────────────────────────────────────────────────────
DIALOGUE_EVENT_TRUNCATE_CHARS = 4096
MEMORY_FALLBACK_TRUNCATE_CHARS = 512

# ── Game Logic ─────────────────────────────────────────────────────────────
INITIAL_MORAL_ALIGNMENT = 50

# ── Prompt / Context ───────────────────────────────────────────────────────
MAX_CONTEXT_CHARS = 16384  # rough guard before tokenisation

# ── API Server ─────────────────────────────────────────────────────────────
import os

API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:8080")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", FRONTEND_URL).split(",")
SESSION_SECRET = os.getenv("SESSION_SECRET", "dev-secret-change-in-production")
WS_HEARTBEAT_INTERVAL = 30  # seconds
MAX_CONCURRENT_SESSIONS = 50
