# Prompt engineering strategy

## Grounding contract

The authoritative system prompt lives in `backend/app/rag/generation.py` as `SYSTEM_PROMPT`. It enforces:

- **Context-only** answers tied to retrieved passages.
- **Explicit abstention** sentence when evidence is insufficient (mirrored server-side by retrieval thresholds).
- **JSON-only** structured output for the seven-part answer schema (OpenAI uses `response_format=json_object`).

## Retrieval-aware phrasing

User messages are optionally prefixed with a short **session memory** summary (last direct answer) to support follow-ups without unbounded context growth.

## Provider-specific notes

- **OpenAI**: JSON mode + low temperature (0.2) for deterministic, parseable outputs.
- **Gemini**: same instructions; JSON validity is validated server-side with a forgiving extractor.
- **Ollama**: JSON is requested in prose; if parsing fails, the API surfaces raw text in `ayurvedic_interpretation` while keeping citations.

## Sanskrit fidelity

The model is instructed to copy **Devanagari only from CONTEXT**. Transliteration is allowed only as an explicit transformation of text present in CONTEXT.

## Research mode

Appends a single line nudge toward comparative, evidence-heavy synthesis **without** relaxing the grounding rule.
