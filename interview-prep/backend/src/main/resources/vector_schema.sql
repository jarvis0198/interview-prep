-- Enable pgvector extension (run once as superuser)
CREATE EXTENSION IF NOT EXISTS vector;

-- Vector embeddings table
CREATE TABLE IF NOT EXISTS vector_documents (
    id          BIGSERIAL PRIMARY KEY,
    doc_type    VARCHAR(50)  NOT NULL,  -- QUESTION, COMPANY_KB, TIPS_KB, RESUME_CHUNK, EXTERNAL_KB
    source_id   BIGINT,                 -- FK to resume/session/question id
    content     TEXT         NOT NULL,
    metadata    JSONB,
    embedding   vector(1536),
    created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vector_docs_type    ON vector_documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_vector_docs_source  ON vector_documents(source_id);
-- Cosine similarity index (requires pgvector 0.5+)
CREATE INDEX IF NOT EXISTS idx_vector_docs_embed
    ON vector_documents USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 50);
