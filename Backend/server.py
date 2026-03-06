#!/usr/bin/env python3
"""
NPC Engine — API server entry point.

Starts the FastAPI server for the NPC engine. Configuration is
handled through config.py and environment variables.
"""

from __future__ import annotations
import logging
import sys

import config

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    datefmt="%H:%M:%S",
)


def main():
    # Attempt to load uvicorn
    try:
        import uvicorn
    except ImportError:
        logging.error("uvicorn not installed. Run: pip install uvicorn[standard]")
        sys.exit(1)

    logging.info(
        "NPC Engine API starting on http://%s:%s", config.API_HOST, config.API_PORT
    )
    logging.info("CORS origins: %s", config.CORS_ORIGINS)
    logging.info("Frontend URL: %s", config.FRONTEND_URL)

    uvicorn.run(
        "api.app:create_app",
        factory=True,
        host=config.API_HOST,
        port=config.API_PORT,
        reload=False,  # Default to False, can be controlled via env/config if needed
        log_level="info",
    )


if __name__ == "__main__":
    main()
