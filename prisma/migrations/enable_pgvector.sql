-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx 
ON "document_chunks" 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Create index for material lookups
CREATE INDEX IF NOT EXISTS document_chunks_material_idx 
ON "document_chunks" ("materialId");

-- Create index for content search
CREATE INDEX IF NOT EXISTS document_chunks_content_idx 
ON "document_chunks" USING gin(to_tsvector('english', content));
