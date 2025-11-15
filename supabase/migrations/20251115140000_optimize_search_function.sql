-- Optimize search_posts function to support pagination at database level

DROP FUNCTION IF EXISTS search_posts(TEXT, INT);

-- Updated search_posts with offset parameter
CREATE FUNCTION search_posts(
  search_query TEXT,
  result_limit INT DEFAULT 50,
  result_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  slug TEXT,
  excerpt TEXT,
  thumbnail_url TEXT,
  published_at TIMESTAMPTZ,
  view_count INT,
  similarity DOUBLE PRECISION
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
    CAST(GREATEST(
      similarity(p.title, search_query),
      similarity(p.excerpt, search_query)
    ) AS DOUBLE PRECISION) AS similarity
  FROM posts p
  WHERE
    p.is_published = true
    AND (
      p.search_vector @@ plainto_tsquery('simple', search_query)
      OR similarity(p.title, search_query) > 0.1
      OR similarity(p.excerpt, search_query) > 0.1
    )
  ORDER BY similarity DESC, p.published_at DESC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Also update search_suggestions to be more efficient
DROP FUNCTION IF EXISTS search_suggestions(TEXT);

CREATE FUNCTION search_suggestions(search_query TEXT)
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
  WHERE
    p.is_published = true
    AND (
      p.title ILIKE '%' || search_query || '%'
      OR p.excerpt ILIKE '%' || search_query || '%'
    )
  ORDER BY p.view_count DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql STABLE;
