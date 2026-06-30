"""
Entry point for the Synthesize ingestion pipeline.
Runs as a standalone service that listens for JSON packages
and processes them through the IngestionModule.
"""

import asyncio
import logging

from .ingestion import create_ingestion_module

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


async def main():
    logger.info("Starting Synthesize ingestion pipeline...")

    module = create_ingestion_module()
    await module.start()

    logger.info("IngestionModule is running. Waiting for packages...")

    try:
        # Keep running until interrupted
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        logger.info("Shutdown signal received...")
    finally:
        await module.stop()

    logger.info("Ingestion pipeline stopped.")


if __name__ == "__main__":
    asyncio.run(main())