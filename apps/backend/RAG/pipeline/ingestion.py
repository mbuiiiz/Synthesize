"""
Synthesize IngestionModule
===========================
Hybrid architecture:
  - Main thread receives JSON packages via queue.Queue
  - ThreadPoolExecutor handles CPU-bound: data cleaning → chunking (Could change to ProcessPool for parrallel execution --- TODO: Benchmark and check ts)
  - Asyncio event loop handles IO-bound: OpenAI embedding + pgvector insert

Architecture:
    ┌──────────────────────────────────────────────────────────┐
    │                   IngestionModule                        │
    │                                                          │
    │  Main Thread: consume_queue()                            │
    │    │                                                     │
    │    ├── validate(pkg) → enqueue task                      │
    │    │                                                     │
    │    └── ThreadPoolExecutor (CPU-bound)                    │
    │         clean() → chunk_document()                       │
    │              │                                           │
    │              └── put chunks into asyncio.Queue           │
    │                                                          │
    │  Async IO Loop:                                          │
    │    asyncio.Queue → openai_embed() → pgvector.write()     │
    │         ↑ concurrent OpenAI calls via httpx              │
    │                                                          │
    │  Error Queue: exponential backoff for failed chunks      │
    └──────────────────────────────────────────────────────────┘
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import re
import time
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
from dataclasses import dataclass, field
from enum import Enum
from queue import Queue as ThreadQueue
from typing import Any, Optional

import httpx
import psycopg
from pgvector.psycopg import register_vector_async

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
#  Data Models
# ─────────────────────────────────────────────

class IngestStatus(Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class JSONPackage:
    """Incoming document to be ingested."""
    doc_id: str
    workspace_id: str
    content: str                           # Raw HTML or text content
    source_url: Optional[str] = None
    title: Optional[str] = None
    metadata: dict[str, Any] = field(default_factory=dict)
    content_type: str = "text"             # "html" | "text" | "markdown"

    @classmethod
    def from_dict(cls, data: dict) -> "JSONPackage":
        required = {"doc_id", "workspace_id", "content"}
        missing = required - set(data.keys())
        if missing:
            raise ValueError(f"Missing required fields: {missing}")
        return cls(
            doc_id=data["doc_id"],
            workspace_id=data["workspace_id"],
            content=data["content"],
            source_url=data.get("source_url"),
            title=data.get("title"),
            metadata=data.get("metadata", {}),
            content_type=data.get("content_type", "text"),
        )


@dataclass
class DocumentChunk:
    """A single chunk produced from a cleaned document."""
    chunk_id: str
    doc_id: str
    workspace_id: str
    chunk_index: int
    content: str
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class FailedChunk:
    """Represents a chunk that failed processing, with retry info."""
    chunk: DocumentChunk
    error: str
    retry_count: int = 0
    last_attempt: float = 0.0


# ─────────────────────────────────────────────
#  Data Cleaning Layer
# ─────────────────────────────────────────────

class DataCleaner:
    """Normalizes raw content before chunking."""

    @staticmethod
    def clean_html(html: str) -> str:
        """Strip HTML tags, scripts, styles, and normalize whitespace."""
        # Remove scripts and styles
        html = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL)
        html = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.DOTALL)
        # Remove all HTML tags
        html = re.sub(r'<[^>]+>', ' ', html)
        # Decode common HTML entities
        # NOTE: Using chr() to prevent auto-formatter from clobbering entity strings
        AMP = chr(38)  # &
        LT = chr(60)   # <
        GT = chr(62)   # >
        QUOT = chr(34) # "
        APOS = chr(39) # '
        html = (
            html.replace(f"{AMP}amp;", "&")
            .replace(f"{AMP}lt;", "<")
            .replace(f"{AMP}gt;", ">")
            .replace(f"{AMP}quot;", '"')
            .replace(f"{AMP}#39;", "'")
            .replace(f"{AMP}#x27;", "'")
            .replace(f"{AMP}#x2F;", "/")
        )
        return DataCleaner._normalize_whitespace(html)

    @staticmethod
    def clean_markdown(md: str) -> str:
        """Strip markdown syntax, keeping the text content."""
        # Remove code blocks
        md = re.sub(r'```[\s\S]*?```', '', md)
        # Remove inline code
        md = re.sub(r'`[^`]+`', '', md)
        # Remove images
        md = re.sub(r'!\[.*?\]\(.*?\)', '', md)
        # Remove links, keep text
        md = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', md)
        # Remove headers markers
        md = re.sub(r'^#{1,6}\s+', '', md, flags=re.MULTILINE)
        # Remove bold/italic markers
        md = re.sub(r'[*_]{1,3}([^*_]+)[*_]{1,3}', r'\1', md)
        return DataCleaner._normalize_whitespace(md)

    @staticmethod
    def clean_text(text: str) -> str:
        """Basic text normalization."""
        return DataCleaner._normalize_whitespace(text)

    @staticmethod
    def _normalize_whitespace(text: str) -> str:
        """Collapse multiple whitespace characters into single space."""
        text = re.sub(r'\s+', ' ', text)
        return text.strip()


# ─────────────────────────────────────────────
#  Chunking Layer
# ─────────────────────────────────────────────

class TextChunker:
    """Splits cleaned text into overlapping chunks."""

    def __init__(
        self,
        chunk_size: int = 1000,
        chunk_overlap: int = 200,
        separators: Optional[list[str]] = None,
    ):
        if chunk_overlap >= chunk_size:
            raise ValueError("chunk_overlap must be less than chunk_size")
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.separators = separators or ["\n\n", "\n", ". ", " ", ""]

    def chunk(self, text: str) -> list[str]:
        """Recursive character text splitter."""
        if not text:
            return []

        # Try splitting with the first separator
        sep = self.separators[0]
        if sep == "":
            # Fallback: split by character count with overlap
            return self._split_by_chars(text)

        splits = text.split(sep) if sep else [text]

        # If we're already at the target size, return
        if len(splits) <= self.chunk_size:
            # Recursively split each piece further if it's still too large
            result: list[str] = []
            remaining_seps = self.separators[1:]
            sub_chunker = TextChunker(
                chunk_size=self.chunk_size,
                chunk_overlap=self.chunk_overlap,
                separators=remaining_seps or [""],
            )
            for split in splits:
                if len(split) > self.chunk_size:
                    result.extend(sub_chunker.chunk(split))
                else:
                    result.append(split)
            return self._merge_chunks(result)

        return self._merge_chunks(splits)

    def _split_by_chars(self, text: str) -> list[str]:
        """Fallback: split by character count with overlap."""
        chunks: list[str] = []
        start = 0
        while start < len(text):
            end = min(start + self.chunk_size, len(text))
            chunks.append(text[start:end])
            start += self.chunk_size - self.chunk_overlap
        return chunks

    def _merge_chunks(self, chunks: list[str]) -> list[str]:
        """Merge small chunks until they reach chunk_size, then create overlaps."""
        merged: list[str] = []
        buffer = ""

        for chunk in chunks:
            if not chunk.strip():
                continue
            if len(buffer) + len(chunk) <= self.chunk_size:
                buffer = (buffer + " " + chunk).strip()
            else:
                if buffer:
                    merged.append(buffer)
                buffer = chunk

        if buffer:
            merged.append(buffer)

        return merged


# ─────────────────────────────────────────────
#  OpenAI Embedding Client (Async)
# ─────────────────────────────────────────────

class OpenAIEmbedder:
    """Async OpenAI embedding client with retry and rate limiting."""

    def __init__(
        self, api_key: str,
        model: str = "text-embedding-3-small",
        max_retries: int = 3,
        base_delay: float = 1.0,
        max_concurrent: int = 20,
    ):
        self.api_key = api_key
        self.model = model
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_concurrent = max_concurrent
        self._semaphore = asyncio.Semaphore(max_concurrent)

    async def embed(self, text: str) -> list[float]:
        """Embed a single text string with retry logic."""
        async with self._semaphore:
            for attempt in range(self.max_retries):
                try:
                    async with httpx.AsyncClient(timeout=30.0) as client:
                        resp = await client.post(
                            "https://api.openai.com/v1/embeddings",
                            headers={
                                "Authorization": f"Bearer {self.api_key}",
                                "Content-Type": "application/json",
                            },
                            json={"input": text, "model": self.model},
                        )
                        resp.raise_for_status()
                        data = resp.json()
                        return data["data"][0]["embedding"]
                except (httpx.HTTPStatusError, httpx.TimeoutException) as e:
                    if attempt == self.max_retries - 1:
                        raise
                    delay = self.base_delay * (2 ** attempt)
                    logger.warning(
                        "OpenAI embed attempt %d failed: %s. Retrying in %.1fs...",
                        attempt + 1, e, delay,
                    )
                    await asyncio.sleep(delay)

        raise RuntimeError(f"Failed to embed after {self.max_retries} attempts")

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Embed multiple texts concurrently."""
        tasks = [self.embed(t) for t in texts]
        return await asyncio.gather(*tasks)


# ─────────────────────────────────────────────
#  pgvector Writer (Thread-safe)
# ─────────────────────────────────────────────

class PgVectorWriter:
    """Thread-safe writer to pgvector using connection pool."""

    def __init__(
        self, db_params: dict[str, Any],
        min_connections: int = 2, max_connections: int = 8,
    ):
        self.db_params = db_params
        self.min_connections = min_connections
        self.max_connections = max_connections
        self._pool: list[psycopg.AsyncConnection] = []
        self._pool_lock = asyncio.Lock()

    async def _get_connection(self) -> psycopg.AsyncConnection:
        """Get a connection from the pool (creates if needed)."""
        async with self._pool_lock:
            if self._pool:
                conn = self._pool.pop()
                # Verify it's still alive
                try:
                    conn.execute("SELECT 1")
                    return conn
                except psycopg.OperationalError:
                    pass  # Dead connection, will create new one
            return await self._create_connection()

    def _create_connection(self) -> psycopg.AsyncConnection:
        """Create a new native async DB connection."""
        conn = await psycopg.AsyncConnection.connect(**self.db_params)
        register_vector(conn)
        return conn

    async def _return_connection(self, conn: psycopg.AsyncConnection) -> None:
        """Return a connection to the pool."""
        async with self._pool_lock:
            if len(self._pool) < self.max_connections:
                self._pool.append(conn)
            else:
                conn.close()

    async def insert_chunk(
        self, workspace_id: str, doc_id: str,
        chunk_index: int, content: str, embedding: list[float], metadata: dict[str, Any],
    ) -> None:
        """Insert a single chunk with its embedding."""
        conn = await self._get_connection()
        try:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    INSERT INTO doc_embedding (doc_id, workspace_id, chunk_index, content, embedding, metadata)
                    VALUES (%s, %s, %s, %s, %s, %s::jsonb)
                    ON CONFLICT (doc_id, chunk_index) DO NOTHING
                    """,
                    (doc_id, workspace_id, chunk_index, content, embedding, json.dumps(metadata)),
                )
            await conn.commit()
        finally:
            await self._return_connection(conn)

    async def close(self) -> None:
        """Close all connections in the pool."""
        async with self._pool_lock:
            for conn in self._pool:
                await conn.close()
            self._pool.clear()


# ─────────────────────────────────────────────
#  IngestionModule - Main Class
# ─────────────────────────────────────────────

class IngestionModule:
    """
    Hybrid ingestion pipeline:
      - Main thread: receives JSON packages via thread-safe queue
      - ThreadPoolExecutor: data cleaning → chunking (CPU-bound)
      - Asyncio event loop: OpenAI embedding + pgvector insert (IO-bound)

    Usage:
        module = IngestionModule(
            db_params=DB_PARAMS,
            openai_api_key="sk-...",
            chunk_size=1000,
            chunk_overlap=200,
            num_chunk_workers=4,
        )

        # Start the pipeline in an asyncio event loop
        await module.start()

        # Feed documents from any thread
        module.enqueue_package(json_package)

        # Graceful shutdown
        await module.stop()
    """

    def __init__(
        self,
        db_params: dict[str, Any],
        openai_api_key: str,
        openai_model: str = "text-embedding-3-small",
        chunk_size: int = 1000,
        chunk_overlap: int = 200,
        num_chunk_workers: int = 4,
        max_concurrent_embeddings: int = 20,
        db_min_connections: int = 2,
        db_max_connections: int = 8,
        error_retry_max: int = 3,
        error_retry_delay: float = 5.0,
    ):
        self.num_chunk_workers = num_chunk_workers
        self.error_retry_max = error_retry_max
        self.error_retry_delay = error_retry_delay

        # Thread-safe queue for incoming packages
        self._incoming_queue: ThreadQueue[JSONPackage] = ThreadQueue()

        # Thread pool for CPU-bound chunking
        self._chunk_pool = ThreadPoolExecutor(
            max_workers=num_chunk_workers,
            thread_name_prefix="chunker",
        )

        # Swapable, for true parrallel exec experiment
        # self._chunk_pool = ProcessPoolExecutor(
            # max_workers=num_chunk_workers
        # )

        # Cleaner and chunker (stateless, thread-safe)
        self._cleaner = DataCleaner()
        self._chunker = TextChunker(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
        )

        # Async components
        self._embedder = OpenAIEmbedder(
            api_key=openai_api_key,
            model=openai_model,
            max_concurrent=max_concurrent_embeddings,
        )
        self._db_writer = PgVectorWriter(
            db_params=db_params,
            min_connections=db_min_connections,
            max_connections=db_max_connections,
        )

        # Internal async queue for chunks ready to embed
        self._chunk_queue: asyncio.Queue[list[DocumentChunk]] = asyncio.Queue()

        # Error queue for failed chunks (with retry)
        self._error_chunks: list[FailedChunk] = []

        # Pipeline control
        self._running = False
        self._main_task: Optional[asyncio.Task] = None
        self._embed_task: Optional[asyncio.Task] = None
        self._retry_task: Optional[asyncio.Task] = None

        # Metrics
        self.metrics = IngestionMetrics()

    # ── Public API ────────────────────────────

    def enqueue_package(self, package: JSONPackage) -> None:
        """Enqueue a JSON package for ingestion. Thread-safe."""
        if not self._running:
            raise RuntimeError("IngestionModule is not running. Call start() first.")
        self._incoming_queue.put(package)
        self.metrics.packages_received += 1
        logger.info("Enqueued package: doc_id=%s", package.doc_id)

    async def start(self) -> None:
        """Start the ingestion pipeline."""
        if self._running:
            logger.warning("IngestionModule is already running")
            return

        self._running = True
        loop = asyncio.get_running_loop()

        # Start async tasks
        self._main_task = loop.create_task(self._consume_queue(), name="queue-consumer")
        self._embed_task = loop.create_task(self._embed_loop(), name="embed-loop")
        self._retry_task = loop.create_task(self._retry_loop(), name="retry-loop")

        logger.info(
            "IngestionModule started: %d chunk workers, max %d concurrent embeddings",
            self.num_chunk_workers,
            self._embedder.max_concurrent,
        )

    async def stop(self, wait: bool = True) -> None:
        """
        Gracefully stop the ingestion pipeline.
        
        Args:
            wait: If True, wait for queued items to finish before stopping.
        """
        self._running = False
        logger.info("IngestionModule stopping...")

        if wait:
            # Wait for incoming queue to drain
            queue_size = self._incoming_queue.qsize()
            if queue_size > 0:
                logger.info("Waiting for %d queued packages to process...", queue_size)

        # Signal embed loop to stop
        await self._chunk_queue.put(None)  # Sentinel

        # Cancel tasks
        for task in [self._main_task, self._embed_task, self._retry_task]:
            if task and not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

        # Shutdown thread pool
        self._chunk_pool.shutdown(wait=wait)

        # Close DB connections
        await self._db_writer.close()

        logger.info("IngestionModule stopped. Metrics: %s", self.metrics)

    # ── Internal Pipeline ─────────────────────

    async def _consume_queue(self) -> None:
        """
        Main loop: consume packages from thread-safe queue and dispatch
        CPU-bound chunking to the thread pool.
        """
        loop = asyncio.get_running_loop()

        while self._running:
            try:
                # Non-blocking get with a timeout so we can check _running
                package = await asyncio.to_thread(
                    self._incoming_queue.get, timeout=1.0
                )
            except Exception:
                # Timeout or empty queue, just loop
                continue

            self.metrics.packages_processing += 1

            # Dispatch chunking to thread pool
            loop.create_task(
                self._process_package(package)
            )

        logger.info("Queue consumer stopped")

    async def _process_package(self, package: JSONPackage) -> None:
        """
        Process a single package in the thread pool.
        Step 1: Clean + Chunk (CPU-bound, runs in executor)
        Step 2: Enqueue chunks for embedding (IO-bound, async)
        """
        loop = asyncio.get_running_loop()

        try:
            # ── Step 1: Clean ──
            cleaned = await loop.run_in_executor(
                self._chunk_pool,
                self._clean_document,
                package,
            )

            if not cleaned.strip():
                logger.warning("Empty content after cleaning: doc_id=%s", package.doc_id)
                self.metrics.packages_skipped += 1
                return

            # ── Step 2: Chunk ──
            raw_chunks = await loop.run_in_executor(
                self._chunk_pool,
                self._chunker.chunk,
                cleaned,
            )

            if not raw_chunks:
                logger.warning("No chunks produced: doc_id=%s", package.doc_id)
                self.metrics.packages_skipped += 1
                return

            # ── Build chunk objects ──
            chunks = [
                DocumentChunk(
                    chunk_id=self._make_chunk_id(package.doc_id, i),
                    doc_id=package.doc_id,
                    workspace_id=package.workspace_id,
                    chunk_index=i,
                    content=chunk_text,
                    metadata={
                        **package.metadata,
                        "source_url": package.source_url,
                        "title": package.title,
                        "total_chunks": len(raw_chunks),
                    },
                )
                for i, chunk_text in enumerate(raw_chunks)
            ]

            self.metrics.chunks_produced += len(chunks)
            logger.info(
                "Chunked doc_id=%s into %d chunks",
                package.doc_id, len(chunks),
            )

            # ── Enqueue for embedding ──
            await self._chunk_queue.put(chunks)

        except Exception as e:
            logger.error("Failed to process package doc_id=%s: %s", package.doc_id, e)
            self.metrics.packages_failed += 1

    async def _embed_loop(self) -> None:
        """
        Async loop: consume chunks from the chunk queue, embed them via OpenAI,
        and write to pgvector.
        """
        while self._running:
            chunks = await self._chunk_queue.get()

            # Sentinel to stop
            if chunks is None:
                break

            try:
                # ── Embed all chunks concurrently ──
                texts = [c.content for c in chunks]
                embeddings = await self._embedder.embed_batch(texts)

                # ── Write all chunks to pgvector ──
                for chunk, embedding in zip(chunks, embeddings):
                    try:
                        await self._db_writer.insert_chunk(
                            workspace_id=chunk.workspace_id,
                            doc_id=chunk.doc_id,
                            chunk_index=chunk.chunk_index,
                            content=chunk.content,
                            embedding=embedding,
                            metadata=chunk.metadata,
                        )
                        self.metrics.chunks_embedded += 1
                    except Exception as e:
                        logger.error(
                            "Failed to insert chunk doc_id=%s idx=%d: %s",
                            chunk.doc_id, chunk.chunk_index, e,
                        )
                        self._error_chunks.append(
                            FailedChunk(chunk=chunk, error=str(e))
                        )
                        self.metrics.chunks_failed += 1

            except Exception as e:
                logger.error("Embed batch failed for %d chunks: %s", len(chunks), e)
                for chunk in chunks:
                    self._error_chunks.append(
                        FailedChunk(chunk=chunk, error=str(e))
                    )
                self.metrics.chunks_failed += len(chunks)

        logger.info("Embed loop stopped")

    async def _retry_loop(self) -> None:
        """
        Retry loop: periodically attempt to re-process failed chunks
        with exponential backoff.
        """
        while self._running:
            await asyncio.sleep(self.error_retry_delay)

            if not self._error_chunks:
                continue

            now = time.time()
            retryable = []
            still_failed = []

            for failed in self._error_chunks:
                if failed.retry_count >= self.error_retry_max:
                    logger.error(
                        "Chunk doc_id=%s idx=%d exhausted retries (%d). Dropping.",
                        failed.chunk.doc_id, failed.chunk.chunk_index,
                        failed.retry_count,
                    )
                    self.metrics.chunks_dropped += 1
                    continue

                # Exponential backoff: delay * 2^retry_count
                backoff = self.error_retry_delay * (2 ** failed.retry_count)
                if now - failed.last_attempt >= backoff:
                    retryable.append(failed)
                else:
                    still_failed.append(failed)

            if retryable:
                logger.info("Retrying %d failed chunks...", len(retryable))
                # Re-embed and insert
                texts = [f.chunk.content for f in retryable]
                try:
                    embeddings = await self._embedder.embed_batch(texts)
                    for failed, embedding in zip(retryable, embeddings):
                        try:
                            await self._db_writer.insert_chunk(
                                workspace_id=failed.chunk.workspace_id,
                                doc_id=failed.chunk.doc_id,
                                chunk_index=failed.chunk.chunk_index,
                                content=failed.chunk.content,
                                embedding=embedding,
                                metadata=failed.chunk.metadata,
                            )
                            self.metrics.chunks_embedded += 1
                        except Exception as e:
                            failed.retry_count += 1
                            failed.last_attempt = now
                            failed.error = str(e)
                            still_failed.append(failed)
                            logger.warning(
                                "Retry %d failed for chunk doc_id=%s idx=%d: %s",
                                failed.retry_count, failed.chunk.doc_id,
                                failed.chunk.chunk_index, e,
                            )
                except Exception as e:
                    for f in retryable:
                        f.retry_count += 1
                        f.last_attempt = now
                        f.error = str(e)
                        still_failed.append(f)

            self._error_chunks = still_failed

        logger.info("Retry loop stopped")

    # ── Helpers ───────────────────────────────

    @staticmethod
    def _make_chunk_id(doc_id: str, chunk_index: int) -> str:
        """Create a deterministic chunk ID."""
        raw = f"{doc_id}:{chunk_index}"
        return hashlib.sha256(raw.encode()).hexdigest()[:16]

    @staticmethod
    def _clean_document(package: JSONPackage) -> str:
        """Route to the appropriate cleaner based on content type."""
        cleaner = DataCleaner()
        if package.content_type == "html":
            return cleaner.clean_html(package.content)
        elif package.content_type == "markdown":
            return cleaner.clean_markdown(package.content)
        else:
            return cleaner.clean_text(package.content)


# ─────────────────────────────────────────────
#  Metrics
# ─────────────────────────────────────────────

@dataclass
class IngestionMetrics:
    """Collects ingestion pipeline metrics."""
    packages_received: int = 0
    packages_processing: int = 0
    packages_skipped: int = 0
    packages_failed: int = 0
    chunks_produced: int = 0
    chunks_embedded: int = 0
    chunks_failed: int = 0
    chunks_dropped: int = 0

    @property
    def success_rate(self) -> float:
        total = self.chunks_produced
        if total == 0:
            return 1.0
        return (self.chunks_embedded) / total

    def __str__(self) -> str:
        return (
            f"pkgs={self.packages_received} recv, "
            f"{self.packages_failed} failed, "
            f"{self.chunks_produced} chunks, "
            f"{self.chunks_embedded} embedded, "
            f"{self.chunks_dropped} dropped, "
            f"success_rate={self.success_rate:.1%}"
        )


# ─────────────────────────────────────────────
#  Convenience Runner
# ─────────────────────────────────────────────

def create_ingestion_module(
    db_params: Optional[dict[str, Any]] = None,
    openai_api_key: Optional[str] = None,
    **kwargs,
) -> IngestionModule:
    """
    Factory function to create an IngestionModule with sensible defaults.
    
    Args:
        db_params: PostgreSQL connection parameters. Defaults to local dev.
        openai_api_key: OpenAI API key. Reads from env if not provided.
        **kwargs: Additional args passed to IngestionModule.
    """
    import os

    if db_params is None:
        db_params = {
            "dbname": os.environ.get("POSTGRES_DB", "synthesize_db"),
            "user": os.environ.get("POSTGRES_USER", "synthesize_admin"),
            "password": os.environ.get("POSTGRES_PASSWORD", ""),
            "host": os.environ.get("DB_HOST", "localhost"),
            "port": int(os.environ.get("DB_PORT", "5432")),
        }

    if openai_api_key is None:
        openai_api_key = os.environ.get("OPENAI_API_KEY")
        if not openai_api_key:
            raise ValueError(
                "OPENAI_API_KEY must be provided or set as environment variable"
            )

    return IngestionModule(
        db_params=db_params,
        openai_api_key=openai_api_key,
        **kwargs,
    )