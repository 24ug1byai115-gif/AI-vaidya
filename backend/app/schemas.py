from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class SourceCitation(BaseModel):
    chunk_id: str
    excerpt: str
    source_path: str | None = None
    page: int | None = None
    chapter: str | None = None
    score: float
    entities: list[str] = Field(default_factory=list)


class StructuredAnswer(BaseModel):
    direct_answer: str
    sanskrit_source_verse: str | None = None
    transliteration: str | None = None
    english_translation: str | None = None
    ayurvedic_interpretation: str | None = None
    source_citation: str
    confidence_score: float


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None
    research_mode: bool = False
    stream: bool = False


class ChatResponse(BaseModel):
    answer: StructuredAnswer
    citations: list[SourceCitation]
    grounded: bool
    retrieval_notes: str | None = None


class IngestResponse(BaseModel):
    document_id: str
    chunks_created: int
    pages: int
    languages_detected: list[str]
    warnings: list[str] = Field(default_factory=list)


class HealthResponse(BaseModel):
    status: str
    embedding_model: str
    chroma_documents: int
    llm_provider: str
    openai_configured: bool = False
    google_configured: bool = False


class ExploreTermRequest(BaseModel):
    term: str


class ExploreTermResponse(BaseModel):
    term: str
    devanagari: str | None = None
    iast: str | None = None
    english_translation: str | None = None
    ayurvedic_meaning: str | None = None
    detected_entities: list[str]
    sample_contexts: list[dict[str, Any]]
