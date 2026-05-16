from __future__ import annotations

import re
import uuid
from typing import Any

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.config import get_settings
from app.ingestion.ocr import ocr_pdf_pages_scanned
from app.ingestion.pipeline import (
    chunk_text_semantic,
    detect_languages,
    ingest_pdf_file,
    save_upload,
)
from app.rag.generation import NOT_FOUND, generate_answer, translate_sanskrit_term
from app.rag.retrieval import retrieve_hybrid
from app.rag.store import get_corpus_store
from app.schemas import (
    ChatRequest,
    ChatResponse,
    ExploreTermRequest,
    ExploreTermResponse,
    HealthResponse,
    IngestResponse,
    StructuredAnswer,
)
from app.sanskrit.engine import (
    devanagari_to_iast,
    iast_to_devanagari,
    tag_ayurvedic_entities,
)

router = APIRouter()

_session_memory: dict[str, str] = {}


def _answer_is_grounded(answer: StructuredAnswer) -> bool:
    d = answer.direct_answer
    if d.startswith(NOT_FOUND):
        return False
    if d.startswith("The LLM is not configured or failed"):
        return False
    if d.startswith("Model output was not valid JSON"):
        return False
    return True


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    settings = get_settings()
    store = get_corpus_store()
    return HealthResponse(
        status="ok",
        embedding_model=settings.embedding_model,
        chroma_documents=store.count(),
        llm_provider=settings.llm_provider,
        openai_configured=bool(settings.openai_api_key),
        google_configured=bool(settings.google_api_key),
    )


@router.post("/ingest/pdf", response_model=IngestResponse)
async def ingest_pdf(
    file: UploadFile = File(...),
    ocr_fallback: bool = False,
) -> IngestResponse:
    if not file.filename:
        raise HTTPException(400, "filename required")
    data = await file.read()
    if len(data) < 50:
        raise HTTPException(400, "empty upload")
    path = await save_upload(file.filename, data)
    payload = await ingest_pdf_file(path)
    warns = list(payload["warnings"])
    text_blob = "\n\n".join(c["text"] for c in payload["chunks"])
    if ocr_fallback and len(text_blob.strip()) < 400:
        ocr_text, ow = await ocr_pdf_pages_scanned(path)
        warns.extend(ow)
        if ocr_text.strip():
            langs = detect_languages(ocr_text)
            chunks = chunk_text_semantic(ocr_text)
            payload["chunks"] = [
                {
                    "text": c,
                    "chunk_index": i,
                    "entities": tag_ayurvedic_entities(c),
                    "languages": detect_languages(c),
                }
                for i, c in enumerate(chunks)
            ]
            payload["languages"] = langs
            warns.append("ocr_fallback_used")

    doc_id = str(uuid.uuid4())
    texts = [c["text"] for c in payload["chunks"]]
    if not texts:
        raise HTTPException(400, "No extractable text from PDF; try ocr_fallback=true for scanned books.")
    metas: list[dict[str, Any]] = []
    safe_name = file.filename or path.name
    for c in payload["chunks"]:
        metas.append(
            {
                "document_id": doc_id,
                "source_path": path.name,
                "original_filename": safe_name,
                "entities": ",".join(c.get("entities") or []),
                "languages": ",".join(c.get("languages") or []),
            }
        )
    store = get_corpus_store()
    import asyncio
    await asyncio.to_thread(store.add_chunks, texts, metas)
    return IngestResponse(
        document_id=doc_id,
        chunks_created=len(texts),
        pages=int(payload["pages"] or 0),
        languages_detected=list(payload.get("languages") or []),
        warnings=warns,
    )


@router.get("/ingest/documents")
async def list_documents() -> dict[str, Any]:
    store = get_corpus_store()
    collection = store.collection
    if store.count() == 0:
        return {"documents": [], "total": 0}
        
    data = collection.get(include=["metadatas"])
    metadatas = data.get("metadatas") or []
    
    docs = {}
    for m in metadatas:
        if not m:
            continue
        doc_id = m.get("document_id")
        if doc_id and doc_id not in docs:
            docs[doc_id] = {
                "id": doc_id,
                "document_id": doc_id,
                "filename": m.get("original_filename", "Unknown"),
                "sizeMB": "N/A",
                "chunks": 0
            }
        if doc_id:
            docs[doc_id]["chunks"] += 1
            
    docs_list = list(docs.values())
    return {"documents": docs_list, "total": len(docs_list)}


@router.delete("/ingest/documents/{document_id}")
async def delete_document(document_id: str) -> dict[str, str]:
    store = get_corpus_store()
    collection = store.collection
    
    # Chroma API doesn't support deleting by metadata directly in python easily, 
    # but we can get all chunks with that document_id and delete them by id
    data = collection.get(where={"document_id": document_id})
    ids = data.get("ids") or []
    if ids:
        collection.delete(ids=ids)
        store.rebuild_bm25()
        return {"status": "success", "deleted_chunks": str(len(ids))}
    return {"status": "not_found", "deleted_chunks": "0"}


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    settings = get_settings()
    store = get_corpus_store()
    if store.count() == 0:
        raise HTTPException(400, "No corpus ingested yet. Upload PDFs first.")

    q = req.message.strip()
    if not q:
        raise HTTPException(400, "empty message")

    if req.session_id:
        prev = _session_memory.get(req.session_id)
        if prev:
            q = f"Follow-up context (previous assistant summary): {prev}\n\nCurrent question: {q}"

    chunks = retrieve_hybrid(q)
    answer, citations = await generate_answer(q, chunks, research_mode=req.research_mode)
    grounded = _answer_is_grounded(answer)

    if req.session_id:
        _session_memory[req.session_id] = answer.direct_answer[:1200]

    notes = None
    if not grounded:
        if answer.direct_answer.startswith(NOT_FOUND):
            notes = (
                f"Retrieval confidence {answer.confidence_score:.2f} below threshold "
                f"{settings.min_retrieval_score:.2f} or no passages matched."
            )
        elif answer.direct_answer.startswith("The LLM is not configured or failed"):
            notes = "LLM step failed or API keys are missing; citations are still from your uploaded corpus."
        elif answer.direct_answer.startswith("Model output was not valid JSON"):
            notes = "The model returned non-JSON text; see interpretation and citations below."

    return ChatResponse(
        answer=answer,
        citations=citations,
        grounded=grounded,
        retrieval_notes=notes,
    )


@router.post("/sanskrit/explore", response_model=ExploreTermResponse)
async def explore_term(req: ExploreTermRequest) -> ExploreTermResponse:
    term = req.term.strip()
    if not term:
        raise HTTPException(400, "empty term")
    deva = iast_to_devanagari(term) if not re.search(r"[\u0900-\u097F]", term) else term
    iast = devanagari_to_iast(deva) if deva else None
    hits = retrieve_hybrid(deva or term)[:5]
    
    # For Lexicon, strictly filter out irrelevant vector neighbors.
    # The term must either be present in the text, or the semantic/rerank score must be high.
    filtered_hits = []
    term_lower = (deva or term).lower()
    for h in hits:
        if term_lower in h.text.lower():
            filtered_hits.append(h)
        elif getattr(h, "rerank_score", None) is not None and h.rerank_score > 1.0:
            filtered_hits.append(h)
        elif getattr(h, "rerank_score", None) is None and h.score > 0.88:
            filtered_hits.append(h)

    samples = [
        {
            "chunk_id": h.chunk_id,
            "excerpt": h.text[:400].strip() + "...",
            "score": h.rerank_score if getattr(h, "rerank_score", None) is not None else h.score,
            "source_path": h.metadata.get("original_filename") or h.metadata.get("source_path"),
        }
        for h in filtered_hits
    ]
    ents = tag_ayurvedic_entities(term + " " + (deva or ""))
    
    translation_data = await translate_sanskrit_term(deva or term)
    
    return ExploreTermResponse(
        term=term,
        devanagari=deva,
        iast=iast,
        english_translation=translation_data.get("english_translation"),
        ayurvedic_meaning=translation_data.get("ayurvedic_meaning"),
        detected_entities=ents,
        sample_contexts=samples,
    )


@router.get("/voice/status")
async def voice_status() -> dict[str, str]:
    return {
        "stt": "planned_indic_streaming",
        "tts": "planned_sanskrit_tts",
        "note": "Voice endpoints are stubs for hackathon extension (WebSpeech / VITS / IndicTTS).",
    }


@router.get("/graph/summary")
async def graph_summary() -> dict[str, Any]:
    store = get_corpus_store()
    return {
        "chunks": store.count(),
        "edges": [],
        "note": "Extend with co-occurrence extraction from entity-tagged chunks for manuscript graphs.",
    }
