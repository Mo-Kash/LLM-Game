#!/usr/bin/env python3
"""
NPC Engine — API server entry point.
Usage:
    python server.py [--host HOST] [--port PORT] [--reload] [--reset]

This starts the FastAPI server. The project runs as web-only,
serving the NPC engine via REST and WebSockets.
"""

from __future__ import annotations
import argparse
import logging
import sys
import shutil

import config


def main():
    parser = argparse.ArgumentParser(description="NPC Engine API Server")
    parser.add_argument("--host", default=config.API_HOST, help="Bind host")
    parser.add_argument("--port", type=int, default=config.API_PORT, help="Bind port")
    parser.add_argument(
        "--reload", action="store_true", help="Enable auto-reload (dev)"
    )
    parser.add_argument(
        "--reset", action="store_true", help="Wipe all session data and start fresh"
    )
    parser.add_argument("--debug", action="store_true", help="Enable debug logging")
    args = parser.parse_args()

    level = logging.DEBUG if args.debug else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
        datefmt="%H:%M:%S",
    )

    if args.reset:
        logging.info("Resetting engine state (wiping data directory)...")
        # Wipe global engine files
        config.DB_PATH.unlink(missing_ok=True)
        config.SNAPSHOT_PATH.unlink(missing_ok=True)
        config.FAISS_INDEX_PATH.unlink(missing_ok=True)
        config.FAISS_META_PATH.unlink(missing_ok=True)
        config.EMBED_CACHE_PATH.unlink(missing_ok=True)

        # Wipe all sessions
        sessions_dir = config.DATA_DIR / "sessions"
        if sessions_dir.exists():
            shutil.rmtree(sessions_dir)
            sessions_dir.mkdir(parents=True)
        logging.info("Reset complete.")

    try:
        import uvicorn
    except ImportError:
        print("uvicorn not installed. Run: pip install uvicorn[standard]")
        sys.exit(1)

    print(f"\n  NPC Engine API starting on http://{args.host}:{args.port}")
    print(f"  CORS origins: {config.CORS_ORIGINS}")
    print(f"  Frontend URL: {config.FRONTEND_URL}\n")

    uvicorn.run(
        "api.app:create_app",
        factory=True,
        host=args.host,
        port=args.port,
        reload=args.reload,
        log_level="debug" if args.debug else "info",
    )


if __name__ == "__main__":
    main()
