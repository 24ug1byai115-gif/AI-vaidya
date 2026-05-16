from __future__ import annotations

import os
import threading
import uuid
from typing import Any

# Must run before `import chromadb` to avoid broken PostHog telemetry in some environments.
os.environ["ANONYMIZED_TELEMETRY"] = "False"
os.environ["CHROMA_TELEMETRY_ENABLED"] = "False"

# Completely mock posthog to prevent signature mismatch errors
import sys
class MockPosthogModule:
    class Posthog:
        def __init__(self, *args, **kwargs): pass
        def capture(self, *args, **kwargs): pass
        def flush(self): pass
        def __getattr__(self, item): return lambda *a, **kw: None
    def capture(self, *args, **kwargs): pass
    def __getattr__(self, item): return lambda *a, **kw: None

sys.modules["posthog"] = MockPosthogModule()

import chromadb
from chromadb.api.models.Collection import Collection
from chromadb.config import Settings as ChromaSettings
from rank_bm25 import BM25Okapi

from app.config import get_settings
from app.rag.embeddings import embed_passages, tokenize_for_bm25


def _chroma_safe_metadata(meta: dict[str, Any]) -> dict[str, Any]:
    """Chroma allows only str, int, float, bool — never None."""
    out: dict[str, Any] = {}
    for key, value in meta.items():
        if value is None:
            continue
        if isinstance(value, (str, int, float, bool)):
            out[key] = value
        else:
            out[key] = str(value)
    return out


class CorpusStore:
    """Chroma vector store + synchronized BM25 index."""

    def __init__(self) -> None:
        self._lock = threading.RLock()
        settings = get_settings()
        settings.chroma_persist_dir.mkdir(parents=True, exist_ok=True)
        self._client = chromadb.PersistentClient(
            path=str(settings.chroma_persist_dir),
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        self._collection: Collection = self._client.get_or_create_collection(
            name="aivaidya_corpus",
            metadata={"hnsw:space": "cosine"},
        )
        self._bm25: BM25Okapi | None = None
        self._bm25_ids: list[str] = []
        self._bm25_docs: list[str] = []
        self.rebuild_bm25()

    @property
    def collection(self) -> Collection:
        return self._collection

    def count(self) -> int:
        return int(self._collection.count())

    def get_chunks(self, ids: list[str]) -> dict[str, tuple[str, dict[str, Any]]]:
        if not ids:
            return {}
        res = self._collection.get(ids=ids, include=["documents", "metadatas"])
        out: dict[str, tuple[str, dict[str, Any]]] = {}
        for cid, doc, meta in zip(
            res.get("ids") or [],
            res.get("documents") or [],
            res.get("metadatas") or [],
            strict=False,
        ):
            out[cid] = (doc or "", dict(meta or {}))
        return out

    def rebuild_bm25(self) -> None:
        with self._lock:
            data = self._collection.get(include=["documents"])
            docs = data.get("documents") or []
            ids = data.get("ids") or []
            self._bm25_ids = list(ids)
            self._bm25_docs = list(docs)
            tokenized = [tokenize_for_bm25(d) for d in self._bm25_docs]
            self._bm25 = BM25Okapi(tokenized) if tokenized else None

    def add_chunks(
        self,
        texts: list[str],
        metadatas: list[dict[str, Any]],
    ) -> list[str]:
        ids = [str(uuid.uuid4()) for _ in texts]
        embeddings = embed_passages(texts).tolist()
        safe_meta = [_chroma_safe_metadata(dict(m)) for m in metadatas]
        with self._lock:
            self._collection.add(
                ids=ids,
                documents=texts,
                metadatas=safe_meta,
                embeddings=embeddings,
            )
        self.rebuild_bm25()
        return ids

    def query_vector(self, query_embedding: list[float], k: int) -> dict[str, Any]:
        return self._collection.query(
            query_embeddings=[query_embedding],
            n_results=k,
            include=["documents", "metadatas", "distances"],
        )

    def bm25_scores(self, query: str) -> list[tuple[str, float]]:
        if not self._bm25 or not self._bm25_docs:
            return []
        tokens = tokenize_for_bm25(query)
        if not tokens:
            return []
        scores = self._bm25.get_scores(tokens)
        ranked = sorted(
            zip(self._bm25_ids, scores, self._bm25_docs),
            key=lambda x: x[1],
            reverse=True,
        )
        return [(cid, float(s)) for cid, s, _ in ranked]


_store: CorpusStore | None = None
_store_lock = threading.Lock()


def get_corpus_store() -> CorpusStore:
    global _store
    with _store_lock:
        if _store is None:
            _store = CorpusStore()
        return _store
