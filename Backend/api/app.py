"""
FastAPI application factory.
Creates the app with CORS, exception handlers, and route registration.
"""

from __future__ import annotations
import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import config
from api.session_manager import SessionManager
from api.routes import router as game_router, ws_router, set_session_manager

log = logging.getLogger(__name__)

# ── Shared session manager ─────────────────────────────────────────────────
session_manager = SessionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    log.info("NPC Engine API starting...")
    set_session_manager(session_manager)
    # Eagerly preload embedding model + world seed to eliminate cold-start latency
    try:
        await session_manager._ensure_init()
        log.info("Shared resources preloaded at startup.")
    except Exception as e:
        log.warning("Preloading failed (will retry lazily): %s", e)
    yield
    log.info("NPC Engine API shutting down...")
    await session_manager.shutdown()


def create_app() -> FastAPI:
    app = FastAPI(
        title="NPC Engine API",
        description="Real-time game engine API for the LLM-driven NPC dialogue system.",
        version="0.1.0",
        lifespan=lifespan,
    )

    # ── CORS ───────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Request logging ────────────────────────────────────────────────
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        t0 = time.perf_counter()
        response = await call_next(request)
        elapsed = (time.perf_counter() - t0) * 1000
        log.info(
            "%s %s → %d (%.0fms)",
            request.method,
            request.url.path,
            response.status_code,
            elapsed,
        )
        return response

    # ── Global exception handler ───────────────────────────────────────
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        log.error("Unhandled error on %s: %s", request.url.path, exc, exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error", "detail": str(exc)},
        )

    # ── Routes ─────────────────────────────────────────────────────────
    app.include_router(game_router)
    app.include_router(ws_router)

    # Root health check (for container orchestration)
    @app.get("/health")
    async def root_health():
        return {"status": "ok"}

    return app
