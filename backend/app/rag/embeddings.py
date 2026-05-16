from __future__ import annotations

import re
import threading
from functools import lru_cache
from typing import Sequence

import numpy as np
from sentence_transformers import SentenceTransformer

from app.config import get_settings

_lock = threading.Lock()
_model: SentenceTransformer | None = None


def _load_model() -> SentenceTransformer:
    global _model
    with _lock:
        if _model is None:
            settings = get_settings()
            _model = SentenceTransformer(settings.embedding_model)
        return _model


def is_e5_model(name: str) -> bool:
    return "e5" in name.lower()


def embed_queries(texts: Sequence[str]) -> np.ndarray:
    m = _load_model()
    settings = get_settings()
    inputs = list(texts)
    if is_e5_model(settings.embedding_model):
        inputs = [f"query: {t}" for t in inputs]
    emb = m.encode(inputs, normalize_embeddings=True, show_progress_bar=False)
    return np.asarray(emb, dtype=np.float32)


def embed_passages(texts: Sequence[str]) -> np.ndarray:
    m = _load_model()
    settings = get_settings()
    inputs = list(texts)
    if is_e5_model(settings.embedding_model):
        inputs = [f"passage: {t}" for t in inputs]
    emb = m.encode(inputs, normalize_embeddings=True, show_progress_bar=False)
    return np.asarray(emb, dtype=np.float32)


def tokenize_for_bm25(text: str) -> list[str]:
    return re.findall(r"[\w\u0900-\u0AFF]+", text.lower(), flags=re.UNICODE)
