CREATE EXTENSION IF NOT EXISTS vector;

-- Optional relational mirror of ingested documents (vectors stay in Chroma by default).
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    source_path TEXT,
    mime_type TEXT,
    page_count INT,
    language_hints TEXT[],
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chunks (
    id TEXT PRIMARY KEY,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    page INT,
    chapter TEXT,
    verse_start INT,
    verse_end INT,
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS chunks_document_idx ON chunks(document_id);
