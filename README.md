# AI Vaidya

**AI Vaidya** is a production-lean, hackathon-ready **Sanskrit-aware Ayurvedic RAG assistant**. It ingests your PDF corpus (digital or scanned via OCR hooks), builds a **hybrid vector + BM25** index with **multilingual-e5** embeddings, and answers **only from retrieved passages**—with structured seven-part responses, citations, and explicit abstention when evidence is thin.

## Highlights

- **Grounded generation** with retrieval gating + strict JSON schema (`backend/app/rag/generation.py`).
- **Sanskrit layer**: Devanagari ↔ IAST, verse heuristics, OCR denoise hooks, Ayurvedic entity tags (`backend/app/sanskrit/engine.py`).
- **Hybrid retrieval**: Chroma cosine + BM25 + optional cross-encoder rerank (`backend/app/rag/retrieval.py`).
- **Premium UI**: Next.js 15 + Tailwind + Framer Motion manuscript aesthetic (`frontend/`).
- **Docker Compose**: FastAPI + Postgres (pgvector-ready schema) + Next.js (`docker-compose.yml`).

## Repository layout

```
aivaidya/
├── backend/                 # FastAPI + RAG + ingestion + Sanskrit engine
│   ├── app/
│   │   ├── api/routes.py    # REST surface (/api/chat, /ingest/pdf, /sanskrit/explore, …)
│   │   ├── ingestion/     # PDF extract, chunking, OCR hooks
│   │   ├── rag/           # embeddings, Chroma store, retrieval, generation
│   │   └── sanskrit/      # transliteration + tagging + verse detection
│   ├── sql/init.sql         # optional relational schema (Postgres service)
│   └── requirements.txt
├── frontend/                # Next.js 15 UI
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT.md
│   ├── PROMPTS.md
│   └── EVALUATION.md
├── docker-compose.yml
└── .env.example
```

## Quick start (local)

1. **Backend**

```bash
cd backend
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example ../.env   # configure LLM_PROVIDER + keys or Ollama
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Interactive docs: `http://localhost:8000/docs`

2. **Frontend**

```bash
cd frontend
npm install
export NEXT_PUBLIC_API_URL=http://localhost:8000  # PowerShell: $env:NEXT_PUBLIC_API_URL=...
npm run dev
```

Open `http://localhost:3000`.

3. **Ingest → ask**

- Upload a PDF via the UI (or `POST /api/ingest/pdf`).
- Ask questions referencing **only** that material; inspect citations in the right column of the response panel.

## Docker

```bash
cp .env.example .env
docker compose up --build
```

> **Heads-up:** remove any committed `backend/venv` from version control; use a fresh virtualenv per machine.

## LLM configuration

| Provider | Env |
| --- | --- |
| OpenAI | `LLM_PROVIDER=openai` + `OPENAI_API_KEY` |
| Gemini | `LLM_PROVIDER=gemini` + `GOOGLE_API_KEY` |
| Ollama (offline-friendly) | `LLM_PROVIDER=ollama` + local model pull |

Embeddings always run **locally** via `sentence-transformers` (default `intfloat/multilingual-e5-base`, overridable in `.env`).

## API surface (core)

- `POST /api/ingest/pdf` — multipart upload, optional `ocr_fallback=true`
- `POST /api/chat` — grounded chat + seven-part answer JSON
- `POST /api/sanskrit/explore` — transliterate + show top retrieved contexts
- `GET /api/health` — model + corpus stats
- `GET /api/graph/summary` — placeholder graph metadata
- `GET /api/voice/status` — voice roadmap stub

## Roadmap hooks (from spec)

- Full **Sandhi / morphological** pipelines (Indic NLP / custom FSTs).
- **PaddleOCR / unstructured.io** workers for large scanned corpora.
- **TTS / STT** for śloka audio (see `/api/voice/status`).
- **pgvector** mirroring of chunk embeddings for multi-tenant scale-out.

## License

Add your team / hackathon license here.
