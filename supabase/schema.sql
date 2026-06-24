-- Run this in Supabase → SQL Editor before uploading embeddings.

-- 1. Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Word embeddings table (word2vec-google-news-300 → 300-dim vectors)
CREATE TABLE IF NOT EXISTS word_embeddings (
  word      TEXT PRIMARY KEY,
  embedding VECTOR(300) NOT NULL
);

-- 3. RPC helper: return N random words as a text array.
--    Called by the /api/word-pair Next.js route.
CREATE OR REPLACE FUNCTION get_random_words(n INTEGER DEFAULT 2)
RETURNS TEXT[]
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT ARRAY_AGG(word)
  FROM (
    SELECT word
    FROM word_embeddings
    ORDER BY random()
    LIMIT n
  ) sub;
$$;
