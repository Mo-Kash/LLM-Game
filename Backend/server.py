#!/usr/bin/env python3
"""
NPC Engine — API server entry point.
Usage:
    python server.py [--host HOST] [--port PORT] [--reload]

This starts the FastAPI server. The CLI (main.py) remains separate
and fully functional — both share the same core engine modules.
"""

from __future__ import annotations
import argparse
import logging
import sys

import config


def main():
    parser = argparse.ArgumentParser(description="NPC Engine API Server")
    parser.add_argument("--host", default=config.API_HOST, help="Bind host")
    parser.add_argument("--port", type=int, default=config.API_PORT, help="Bind port")
    parser.add_argument(
        "--reload", action="store_true", help="Enable auto-reload (dev)"
    )
    parser.add_argument("--debug", action="store_true", help="Enable debug logging")
    args = parser.parse_args()

    level = logging.DEBUG if args.debug else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
        datefmt="%H:%M:%S",
    )

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
