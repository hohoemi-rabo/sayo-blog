-- Enable trigram extension for better Japanese text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add tsvector column for full-text search
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(excerpt, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(content, '')), 'C')
) STORED;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_posts_search_vector
ON posts USING GIN (search_vector);

-- Create GIN index for trigram search (better for Japanese)
CREATE INDEX IF NOT EXISTS idx_posts_title_trgm
ON posts USING GIN (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_posts_excerpt_trgm
ON posts USING GIN (excerpt gin_trgm_ops);

-- Create search function using trigram similarity for Japanese text
CREATE OR REPLACE FUNCTION search_posts(search_query TEXT, result_limit INT DEFAULT 50)
RETURNS TABLE (
  id UUID,
  title TEXT,
  slug TEXT,
  excerpt TEXT,
  thumbnail_url TEXT,
  published_at TIMESTAMPTZ,
  view_count INTEGER,
  similarity REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.title,
    p.slug,
    p.excerpt,
    p.thumbnail_url,
    p.published_at,
    p.view_count,
    GREATEST(
      similarity(p.title, search_query),
      similarity(COALESCE(p.excerpt, ''), search_query) * 0.5
    ) AS similarity
  FROM posts p
  WHERE p.is_published = true
    AND (
      p.title ILIKE '%' || search_query || '%'
      OR p.excerpt ILIKE '%' || search_query || '%'
      OR p.search_vector @@ plainto_tsquery('simple', search_query)
    )
  ORDER BY similarity DESC, p.published_at DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION search_posts(TEXT, INT) TO anon;
GRANT EXECUTE ON FUNCTION search_posts(TEXT, INT) TO authenticated;

-- Create function for search suggestions (lightweight, top 5 results)
CREATE OR REPLACE FUNCTION search_suggestions(search_query TEXT)
RETURNS TABLE (
  id UUID,
  title TEXT,
  slug TEXT,
  thumbnail_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.title,
    p.slug,
    p.thumbnail_url
  FROM posts p
  WHERE p.is_published = true
    AND (
      p.title ILIKE '%' || search_query || '%'
      OR p.excerpt ILIKE '%' || search_query || '%'
    )
  ORDER BY
    similarity(p.title, search_query) DESC,
    p.view_count DESC,
    p.published_at DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION search_suggestions(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION search_suggestions(TEXT) TO authenticated;
