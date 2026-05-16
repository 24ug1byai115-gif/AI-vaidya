# Deployment guide

## Local development

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example ../.env   # fill keys / provider
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
export NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

## Docker Compose (API + Postgres + Web)

```bash
cp .env.example .env
docker compose up --build
```

- API: `http://localhost:8000/docs`
- Web: `http://localhost:3000`
- Postgres (optional future mirror): `localhost:5432`

> Note: the default retrieval index is **embedded Chroma** on disk (`chroma_data` volume). PostgreSQL is provisioned for relational metadata / future pgvector mirroring.

## Render / Railway

1. Deploy `backend` as a Web Service with persistent disk mounts for `/data/chroma` and `/data/uploads`.
2. Set environment variables from `.env.example`.
3. Deploy `frontend` separately (or static export) with `NEXT_PUBLIC_API_URL` pointing to the public API URL.

## Vercel

- Deploy the `frontend` directory as a Next.js project.
- Configure `NEXT_PUBLIC_API_URL` to your hosted FastAPI origin and enable CORS on the API for the Vercel domain.

## Hugging Face Spaces

- Wrap the FastAPI app with `uvicorn` command in `README.md` Space config, or ship a minimal Gradio UI calling the REST endpoints.

## AWS (outline)

- **ECS/Fargate** tasks for API + ALB; **EFS** for Chroma persistence; **RDS Postgres** optional.
- **S3** for raw uploads; async worker (Celery/SQS) for heavy OCR jobs.
