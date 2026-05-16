from __future__ import annotations

import threading
from dataclasses import dataclass
from typing import Any

from app.config import get_settings
from app.rag.embeddings import embed_queries
from app.rag.store import get_corpus_store

_reranker = None
_rerank_lock = threading.Lock()


def _maybe_rerank(query: str, candidates: list[RetrievedChunk]) -> list[RetrievedChunk]:
    settings = get_settings()
    if not settings.reranker_model or len(candidates) < 2:
        return candidates
        
    # ms-marco models are English-only and output garbage scores for Devanagari/IAST queries.
    # Bypass reranking for Sanskrit queries to preserve the high-quality multilingual-e5-base embeddings.
    if "ms-marco" in settings.reranker_model.lower():
        import re
        if re.search(r"[\u0900-\u097F\u0100-\u017F\u1E00-\u1EFF]", query):
            return candidates

    global _reranker
    try:
        from sentence_transformers import CrossEncoder
    except Exception:
        return candidates
    with _rerank_lock:
        if _reranker is None:
            _reranker = CrossEncoder(settings.reranker_model)
    pairs = [[query, c.text] for c in candidates]
    scores = _reranker.predict(pairs, show_progress_bar=False)
    for c, s in zip(candidates, scores):
        c.rerank_score = float(s)
    return sorted(candidates, key=lambda x: x.rerank_score or x.score, reverse=True)


@dataclass
class RetrievedChunk:
    chunk_id: str
    text: str
    score: float
    metadata: dict[str, Any]
    rerank_score: float | None = None


def _chroma_distance_to_sim(distance: float) -> float:
    # cosine space in Chroma: distance ≈ 1 - cos_sim for normalized embeddings
    return max(0.0, min(1.0, 1.0 - float(distance)))


def retrieve_hybrid(query: str) -> list[RetrievedChunk]:
    settings = get_settings()
    store = get_corpus_store()
    if store.count() == 0:
        return []

    q_emb = embed_queries([query])[0].tolist()
    vres = store.query_vector(q_emb, settings.retrieval_vector_k)
    ids = (vres.get("ids") or [[]])[0]
    docs = (vres.get("documents") or [[]])[0]
    metas = (vres.get("metadatas") or [[]])[0]
    dists = (vres.get("distances") or [[]])[0]

    vec_map: dict[str, RetrievedChunk] = {}
    for cid, doc, meta, dist in zip(ids, docs, metas, dists):
        sim = _chroma_distance_to_sim(dist)
        vec_map[cid] = RetrievedChunk(
            chunk_id=cid,
            text=doc or "",
            score=sim,
            metadata=dict(meta or {}),
        )

    bm = store.bm25_scores(query)[: settings.retrieval_bm25_k]
    max_bm = max((s for _, s in bm), default=1.0) or 1.0
    for cid, s in bm:
        norm = float(s) / max_bm
        if cid in vec_map:
            vec_map[cid].score = max(vec_map[cid].score, 0.55 * vec_map[cid].score + 0.45 * norm)
        else:
            chunk_map = store.get_chunks([cid])
            text, meta = chunk_map.get(cid, ("", {}))
            vec_map[cid] = RetrievedChunk(
                chunk_id=cid,
                text=text,
                score=0.45 * norm,
                metadata=meta,
            )

    fused = sorted(vec_map.values(), key=lambda x: x.score, reverse=True)
    fused = fused[: max(settings.retrieval_fuse_k * 2, settings.retrieval_fuse_k)]
    fused = _maybe_rerank(query, fused)

    seen_texts: set[str] = set()
    deduped: list[RetrievedChunk] = []
    for c in fused:
        snip = c.text.strip().lower()
        if snip not in seen_texts:
            seen_texts.add(snip)
            deduped.append(c)
            if len(deduped) >= settings.retrieval_fuse_k:
                break

    return deduped
