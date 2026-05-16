from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# When running `uvicorn` from `backend/`, still load repo-root `.env` (parent of backend).
_BACKEND_DIR = Path(__file__).resolve().parent.parent
_REPO_ROOT = _BACKEND_DIR.parent


def _env_file_paths() -> tuple[str, ...]:
    paths: list[str] = []
    for p in (_REPO_ROOT / ".env", _BACKEND_DIR / ".env"):
        if p.is_file():
            paths.append(str(p))
    return tuple(paths) if paths else (".env",)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_env_file_paths(),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: str = "http://localhost:3000"

    chroma_persist_dir: Path = Path("./chroma_data")
    upload_dir: Path = Path("./uploads")

    embedding_model: str = "intfloat/multilingual-e5-base"

    llm_provider: Literal["openai", "gemini", "ollama"] = "openai"
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"
    google_api_key: str | None = None
    gemini_model: str = "gemini-2.0-flash"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2"

    reranker_model: str | None = "cross-encoder/ms-marco-MiniLM-L-6-v2"

    retrieval_vector_k: int = 12
    retrieval_bm25_k: int = 12
    retrieval_fuse_k: int = 8
    min_retrieval_score: float = 0.28

    tesseract_cmd: str | None = None
    paddleocr_enabled: bool = False

    @field_validator("openai_api_key", "google_api_key", mode="before")
    @classmethod
    def _empty_api_key_to_none(cls, v: object) -> str | None:
        if v is None:
            return None
        s = str(v).strip()
        return s if s else None


@lru_cache
def get_settings() -> Settings:
    return Settings()
