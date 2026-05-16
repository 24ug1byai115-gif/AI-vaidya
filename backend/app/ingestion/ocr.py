from __future__ import annotations

import asyncio
import shutil
import subprocess
from pathlib import Path

from app.config import get_settings


async def ocr_image_tesseract(image_path: Path, lang: str = "san+hin+eng") -> tuple[str, list[str]]:
    settings = get_settings()
    warns: list[str] = []
    cmd = ["tesseract", str(image_path), "stdout", "-l", lang]
    if settings.tesseract_cmd:
        cmd[0] = settings.tesseract_cmd
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        out, err = await proc.communicate()
        if proc.returncode != 0:
            warns.append(err.decode(errors="ignore")[:500])
            return "", warns
        return out.decode("utf-8", errors="ignore"), warns
    except FileNotFoundError:
        warns.append("tesseract_not_installed")
        return "", warns


async def ocr_pdf_pages_scanned(pdf_path: Path, max_pages: int = 40) -> tuple[str, list[str]]:
    """Rasterize first N pages and OCR — expensive; guarded for hackathon demos."""
    warns: list[str] = []
    if shutil.which("pdftoppm") is None:
        warns.append("pdftoppm_missing_install_poppler")
        return "", warns
    tmpdir = pdf_path.parent / f"_ocr_{pdf_path.stem}"
    tmpdir.mkdir(exist_ok=True)
    prefix = tmpdir / "page"
    proc = await asyncio.create_subprocess_exec(
        "pdftoppm",
        "-png",
        "-f",
        "1",
        "-l",
        str(max_pages),
        str(pdf_path),
        str(prefix),
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.PIPE,
    )
    _, err = await proc.communicate()
    if proc.returncode != 0:
        warns.append(err.decode(errors="ignore")[:300])
    texts: list[str] = []
    for p in sorted(tmpdir.glob("page-*.png")):
        t, w = await ocr_image_tesseract(p)
        warns.extend(w)
        if t.strip():
            texts.append(t)
    return "\n\n".join(texts), warns
