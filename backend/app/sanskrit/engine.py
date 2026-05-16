from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

from indic_transliteration import sanscript
from indic_transliteration.sanscript import transliterate

DEVANAGARI_RANGE = re.compile(r"[\u0900-\u097F]+")


@dataclass
class VerseSpan:
    text: str
    start_line: int
    end_line: int


def normalize_sanskrit_text(text: str) -> str:
    """Light normalization for OCR/Devanagari corpora."""
    t = unicodedata.normalize("NFC", text)
    t = t.replace("\u200d", "").replace("\u200c", "")
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()


def devanagari_to_iast(text: str) -> str | None:
    if not DEVANAGARI_RANGE.search(text):
        return None
    try:
        return transliterate(text, sanscript.DEVANAGARI, sanscript.IAST)
    except Exception:
        return None


def iast_to_devanagari(text: str) -> str | None:
    try:
        out = transliterate(text, sanscript.IAST, sanscript.DEVANAGARI)
        return out if DEVANAGARI_RANGE.search(out) else None
    except Exception:
        return None


def detect_shloka_blocks(text: str) -> list[VerseSpan]:
    """Heuristic verse grouping: double danda or symmetric short lines."""
    lines = text.splitlines()
    blocks: list[VerseSpan] = []
    buf: list[str] = []
    start = 0
    for i, line in enumerate(lines):
        stripped = line.strip()
        if not buf:
            start = i
        if stripped:
            buf.append(stripped)
        if "॥" in stripped or stripped.endswith("॥"):
            blocks.append(VerseSpan("\n".join(buf), start, i))
            buf = []
        elif len(buf) >= 4 and all(len(x) < 120 for x in buf):
            # possible anustubh-style quatrain without danda in OCR
            blocks.append(VerseSpan("\n".join(buf), start, i))
            buf = []
    if buf:
        blocks.append(VerseSpan("\n".join(buf), start, len(lines) - 1))
    return blocks


AYUR_LEXICON: dict[str, list[str]] = {
    "dosha": ["vāta", "vata", "pitta", "kapha", "tridoṣa", "tridosha"],
    "dhatu": ["rasa", "rakta", "māṃsa", "mamsa", "medas", "asthi", "majja", "śukra", "shukra"],
    "guna": ["sneha", "rukṣa", "ruksha", "guru", "laghu", "śīta", "shita", "uṣṇa", "ushna"],
    "rasa": ["madhura", "amla", "lavana", "kaṭuka", "katuka", "tikta", "kaṣāya", "kashaya"],
    "panchakarma": ["vamana", "virechana", "virecana", "basti", "nasya", "rakta mokṣa", "rakta moksha"],
    "herb_tokens": ["guḍūci", "guduchi", "aśvagandhā", "ashwagandha", "brahmī", "brahmi", "śuṇṭhi", "shunthi"],
}


def tag_ayurvedic_entities(text: str) -> list[str]:
    low = text.lower()
    tags: set[str] = set()
    for label, needles in AYUR_LEXICON.items():
        for n in needles:
            if n.lower() in low:
                tags.add(label)
                break
    return sorted(tags)


def ocr_denoise_heuristic(text: str) -> str:
    """Remove common OCR artifacts in Indic pipelines."""
    t = text
    t = re.sub(r"(?m)^[|Il]{2,}\s*", "", t)
    t = re.sub(r"[ﬁﬂ]", "", t)
    return t
