CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS doc_embedding (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_id      VARCHAR(255) NOT NULL,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content     TEXT NOT NULL,
    embedding   vector(1536) NOT NULL,             -- text-embedding-3-small dimensions
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint: no duplicate chunks for the same doc
    UNIQUE (doc_id, chunk_index)
);

-- Index for vector similarity search (IVFFlat for MVP)
CREATE INDEX IF NOT EXISTS idx_doc_embedding_embedding 
    ON doc_embedding 
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Index for filtering by workspace
CREATE INDEX IF NOT EXISTS idx_doc_embedding_workspace 
    ON doc_embedding (workspace_id);

-- Index for looking up chunks by document
CREATE INDEX IF NOT EXISTS idx_doc_embedding_doc_id 
    ON doc_embedding (doc_id);