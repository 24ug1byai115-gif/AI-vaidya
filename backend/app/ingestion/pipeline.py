from __future__ import annotations

import re
import uuid
from pathlib import Path

import aiofiles
import fitz  # PyMuPDF
import pdfplumber

from app.config import get_settings
from app.sanskrit.engine import (
    detect_shloka_blocks,
    normalize_sanskrit_text,
    ocr_denoise_heuristic,
    tag_ayurvedic_entities,
)


def detect_languages(text: str) -> list[str]:
    langs: set[str] = set()
    if re.search(r"[\u0900-\u097F]", text):
        langs.add("sa-deva")
    if re.search(r"[A-Za-z]{3,}", text):
        langs.add("en")
    if re.search(r"[\u0900-\u097F].*[अ-ह].*|\bक्या\b|\bहै\b", text):
        langs.add("hi")
    return sorted(langs)


def chunk_text_semantic(
    text: str,
    *,
    max_chars: int = 1200,
    overlap: int = 200,
) -> list[str]:
    text = normalize_sanskrit_text(ocr_denoise_heuristic(text))
    verses = detect_shloka_blocks(text)
    chunks: list[str] = []
    if verses and len(text) > max_chars * 1.5:
        for v in verses:
            piece = v.text.strip()
            if len(piece) < 40:
                continue
            if len(piece) <= max_chars:
                chunks.append(piece)
            else:
                chunks.extend(_window_split(piece, max_chars, overlap))
    else:
        chunks = _window_split(text, max_chars, overlap)
    return [c for c in chunks if len(c.strip()) > 30]


def _window_split(text: str, max_chars: int, overlap: int) -> list[str]:
    out: list[str] = []
    start = 0
    n = len(text)
    while start < n:
        end = min(n, start + max_chars)
        part = text[start:end].strip()
        if part:
            out.append(part)
        if end >= n:
            break
        start = max(0, end - overlap)
    return out


async def extract_pdf_text(path: Path) -> tuple[str, int, list[str]]:
    warnings: list[str] = []
    pages_text: list[str] = []
    page_count = 0
    try:
        with fitz.open(path) as doc:
            page_count = doc.page_count
            for i in range(page_count):
                pages_text.append(doc.load_page(i).get_text("text") or "")
    except Exception as e:
        warnings.append(f"pymupdf_failed:{e}")

    joined = "\n\n".join(pages_text)
    if len(joined.strip()) < 200:
        try:
            alt_pages: list[str] = []
            with pdfplumber.open(path) as pdf:
                page_count = len(pdf.pages)
                for p in pdf.pages:
                    alt_pages.append(p.extract_text() or "")
            joined2 = "\n\n".join(alt_pages)
            if len(joined2) > len(joined):
                joined = joined2
                warnings.append("used_pdfplumber_fallback")
        except Exception as e:
            warnings.append(f"pdfplumber_failed:{e}")

    langs = detect_languages(joined)
    return joined, page_count, warnings


async def save_upload(filename: str, data: bytes) -> Path:
    settings = get_settings()
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    safe = re.sub(r"[^A-Za-z0-9._-]+", "_", filename)
    dest = settings.upload_dir / f"{uuid.uuid4().hex}_{safe}"
    async with aiofiles.open(dest, "wb") as f:
        await f.write(data)
    return dest


async def ingest_pdf_file(path: Path) -> dict:
    raw, pages, warns = await extract_pdf_text(path)
    langs = detect_languages(raw)
    chunks = chunk_text_semantic(raw)
    enriched = []
    for i, c in enumerate(chunks):
        enriched.append(
            {
                "text": c,
                "chunk_index": i,
                "entities": tag_ayurvedic_entities(c),
                "languages": detect_languages(c),
            }
        )
    return {
        "path": str(path),
        "pages": pages,
        "warnings": warns,
        "languages": langs,
        "chunks": enriched,
    }
