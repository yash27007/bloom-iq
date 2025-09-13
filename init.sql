-- Initialize bloom_iq database
-- This script runs automatically when the PostgreSQL container starts

-- Enable pgvector extension for vector operations
CREATE EXTENSION IF NOT EXISTS vector;

-- Create any initial tables or configuration here
-- Example: You can add your database schema, initial data, etc.

-- Verify the extension is installed
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Example table with vector column (uncomment if needed)
-- CREATE TABLE IF NOT EXISTS documents (
--     id SERIAL PRIMARY KEY,
--     content TEXT NOT NULL,
--     embedding vector(1536),  -- Adjust dimension as needed
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );
