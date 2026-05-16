from __future__ import annotations

import asyncio
import json
import logging
import re
from typing import Any

import httpx
from openai import AsyncOpenAI

from app.config import Settings, get_settings
from app.rag.retrieval import RetrievedChunk
from app.schemas import SourceCitation, StructuredAnswer

NOT_FOUND = "This information was not found in the uploaded Ayurvedic sources."

_LOG = logging.getLogger(__name__)


def _llm_failure_reason(exc: BaseException, settings: Settings) -> str:
    if isinstance(exc, RuntimeError):
        if str(exc) == "missing_openai_key":
            return "OPENAI_API_KEY is empty or missing in .env — add your sk-... key on the OPENAI_API_KEY line, or set LLM_PROVIDER=gemini and use GOOGLE_API_KEY"
        if str(exc) == "missing_google_key":
            return "GOOGLE_API_KEY is empty or missing in .env — add a key or set LLM_PROVIDER=openai with OPENAI_API_KEY"
        if str(exc) == "gemini_empty_response":
            return "Gemini returned no text (safety block, empty response, or model name); try another GEMINI_MODEL or check the API response in server logs"
    try:
        from openai import APIStatusError, AuthenticationError

        if isinstance(exc, AuthenticationError):
            return "OpenAI rejected the API key (invalid or expired)"
        if isinstance(exc, APIStatusError):
            return f"OpenAI error HTTP {exc.status_code}"
    except Exception:
        pass
    if settings.llm_provider == "ollama":
        if isinstance(exc, httpx.RequestError):
            return f"Could not reach Ollama at {settings.ollama_base_url}"
        if isinstance(exc, httpx.HTTPStatusError):
            return f"Ollama HTTP {exc.response.status_code}"
    msg = str(exc).strip() or type(exc).__name__
    return msg[:220]


SYSTEM_PROMPT = """You are AI Vaidya, a Sanskrit-aware Ayurvedic assistant.
You must answer strictly from the provided CONTEXT passages.
Never invent Sanskrit verses, herbs, or treatments not supported by CONTEXT.
If CONTEXT does not contain enough information, respond with the exact sentence for direct_answer:
"This information was not found in the uploaded Ayurvedic sources."
and leave other textual fields null or short notes referencing absence.

Output a single JSON object with these keys:
- direct_answer (string)
- sanskrit_source_verse (string or null) — copy exact Devanagari line(s) from CONTEXT only
- transliteration (string or null) — IAST if you transliterate only text present in CONTEXT
- english_translation (string or null)
- ayurvedic_interpretation (string)
- source_citation (string) — concise human-readable citation using filenames/pages from metadata
- confidence_score (number 0-1) — your subjective confidence given CONTEXT fit

Do not wrap JSON in markdown fences."""


def _build_context(chunks: list[RetrievedChunk]) -> str:
    parts: list[str] = []
    for i, c in enumerate(chunks, start=1):
        meta = c.metadata
        label = meta.get("original_filename") or meta.get("source_path")
        head = f"[{i}] chunk_id={c.chunk_id} source={label} page={meta.get('page')}"
        parts.append(f"{head}\n{c.text}")
    return "\n\n".join(parts)


def _citations_from_chunks(chunks: list[RetrievedChunk]) -> list[SourceCitation]:
    cites: list[SourceCitation] = []
    for c in chunks:
        meta = c.metadata
        ents = meta.get("entities")
        if isinstance(ents, str):
            ents_list = [e.strip() for e in ents.split(",") if e.strip()]
        elif isinstance(ents, list):
            ents_list = [str(e) for e in ents]
        else:
            ents_list = []
        label = meta.get("original_filename") or meta.get("source_path")
        pg = meta.get("page")
        page_i = None
        if pg is not None:
            try:
                page_i = int(pg)
            except (TypeError, ValueError):
                page_i = None
        ch = meta.get("chapter")
        cites.append(
            SourceCitation(
                chunk_id=c.chunk_id,
                excerpt=c.text[:800],
                source_path=label,
                page=page_i,
                chapter=ch if isinstance(ch, str) else None,
                score=float(c.score),
                entities=ents_list,
            )
        )
    return cites


def _confidence_from_retrieval(chunks: list[RetrievedChunk]) -> float:
    if not chunks:
        return 0.0
    # Cross-encoder rerank scores are uncalibrated (often negative); abstention must use
    # hybrid vector+BM25 scores only. Reranking affects order in retrieval, not this gate.
    top = [c.score for c in chunks[:3]]
    base = sum(top) / len(top)
    return max(0.0, min(1.0, base))


def _extract_json(text: str) -> dict[str, Any]:
    text = text.strip()
    m = re.search(r"\{[\s\S]*\}\s*$", text)
    if m:
        text = m.group(0)
    return json.loads(text)


async def _ollama_generate(prompt: str) -> str:
    settings = get_settings()
    url = f"{settings.ollama_base_url.rstrip('/')}/api/generate"
    payload = {"model": settings.ollama_model, "prompt": prompt, "stream": False}
    async with httpx.AsyncClient(timeout=120.0) as client:
        r = await client.post(url, json=payload)
        r.raise_for_status()
        data = r.json()
        return str(data.get("response", ""))


async def generate_answer(
    user_query: str,
    chunks: list[RetrievedChunk],
    *,
    research_mode: bool,
) -> tuple[StructuredAnswer, list[SourceCitation]]:
    settings = get_settings()
    citations = _citations_from_chunks(chunks)
    conf = _confidence_from_retrieval(chunks)

    if not chunks or conf < settings.min_retrieval_score:
        return (
            StructuredAnswer(
                direct_answer=NOT_FOUND,
                sanskrit_source_verse=None,
                transliteration=None,
                english_translation=None,
                ayurvedic_interpretation="No grounded passage met the retrieval confidence threshold.",
                source_citation="n/a",
                confidence_score=float(conf),
            ),
            citations,
        )

    context = _build_context(chunks)
    user = f"USER_QUESTION:\n{user_query}\n\nCONTEXT:\n{context}\n"
    if research_mode:
        user += "\nMODE: research — prefer longer, comparative explanation still strictly from CONTEXT.\n"
    prompt = SYSTEM_PROMPT + "\n\n" + user

    raw = ""
    try:
        if settings.llm_provider == "openai":
            if not settings.openai_api_key:
                raise RuntimeError("missing_openai_key")
            client = AsyncOpenAI(api_key=settings.openai_api_key)
            comp = await client.chat.completions.create(
                model=settings.openai_model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user},
                ],
                response_format={"type": "json_object"},
                temperature=0.2,
            )
            raw = comp.choices[0].message.content or ""
        elif settings.llm_provider == "gemini":
            if not settings.google_api_key:
                raise RuntimeError("missing_google_key")
            import google.generativeai as genai

            genai.configure(api_key=settings.google_api_key)
            model = genai.GenerativeModel(settings.gemini_model)

            def _run_gemini():
                return model.generate_content(
                    [SYSTEM_PROMPT, user],
                    generation_config={"temperature": 0.2},
                )

            resp = await asyncio.to_thread(_run_gemini)
            raw = getattr(resp, "text", "") or ""
            if not raw.strip():
                raise RuntimeError("gemini_empty_response")
        else:
            raw = await _ollama_generate(SYSTEM_PROMPT + "\n\n" + user)
    except Exception as e:
        _LOG.exception("LLM generation failed (%s)", settings.llm_provider)
        reason = _llm_failure_reason(e, settings)
        top = chunks[0]
        return (
            StructuredAnswer(
                direct_answer=(
                    "The LLM is not configured or failed; showing the strongest retrieved passage instead. "
                    f"Reason: {reason}"
                ),
                sanskrit_source_verse=None,
                transliteration=None,
                english_translation=None,
                ayurvedic_interpretation=top.text[:2000],
                source_citation=f"{top.metadata.get('original_filename') or top.metadata.get('source_path')} (chunk {top.chunk_id})",
                confidence_score=float(conf),
            ),
            citations,
        )

    try:
        data = _extract_json(raw)
    except Exception:
        return (
            StructuredAnswer(
                direct_answer="Model output was not valid JSON; refer to citations.",
                sanskrit_source_verse=None,
                transliteration=None,
                english_translation=None,
                ayurvedic_interpretation=raw[:2000],
                source_citation="see citations",
                confidence_score=float(conf),
            ),
            citations,
        )

    answer = StructuredAnswer(
        direct_answer=str(data.get("direct_answer", NOT_FOUND)),
        sanskrit_source_verse=data.get("sanskrit_source_verse"),
        transliteration=data.get("transliteration"),
        english_translation=data.get("english_translation"),
        ayurvedic_interpretation=str(data.get("ayurvedic_interpretation", "")),
        source_citation=str(data.get("source_citation", "see citations")),
        confidence_score=float(data.get("confidence_score", conf)),
    )
    if NOT_FOUND in answer.direct_answer:
        answer.confidence_score = min(answer.confidence_score, conf)
    return answer, citations


async def translate_sanskrit_term(term: str) -> dict[str, str]:
    settings = get_settings()
    sys_prompt = "You are a Sanskrit and Ayurveda expert. Translate and explain the given term. Return a JSON object with 'english_translation' (literal meaning) and 'ayurvedic_meaning' (medical context if any, else general context)."
    user_prompt = f"Term: {term}"
    
    raw = ""
    try:
        if settings.llm_provider == "openai":
            if not settings.openai_api_key:
                return {}
            client = AsyncOpenAI(api_key=settings.openai_api_key)
            comp = await client.chat.completions.create(
                model=settings.openai_model,
                messages=[
                    {"role": "system", "content": sys_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
            )
            raw = comp.choices[0].message.content or ""
        elif settings.llm_provider == "gemini":
            if not settings.google_api_key:
                return {}
            import google.generativeai as genai
            genai.configure(api_key=settings.google_api_key)
            model = genai.GenerativeModel(settings.gemini_model)
            resp = await asyncio.to_thread(lambda: model.generate_content([sys_prompt, user_prompt]))
            raw = getattr(resp, "text", "") or ""
        else:
            raw = await _ollama_generate(sys_prompt + "\n\n" + user_prompt)
            
        data = _extract_json(raw)
        return {
            "english_translation": str(data.get("english_translation", "")),
            "ayurvedic_meaning": str(data.get("ayurvedic_meaning", ""))
        }
    except Exception as e:
        _LOG.exception("Translation failed")
        return {}
