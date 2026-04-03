-- Composite index: most common query pattern
CREATE INDEX IF NOT EXISTS idx_posts_published_composite
  ON posts (is_published, published_at DESC);

-- Partial indexes: only published posts (all public queries)
CREATE INDEX IF NOT EXISTS idx_posts_published_at_partial
  ON posts (published_at DESC)
  WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_posts_view_count_partial
  ON posts (view_count DESC)
  WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_posts_slug_partial
  ON posts (slug)
  WHERE is_published = true;

-- Remove duplicate indexes (UNIQUE constraint indexes suffice)
DROP INDEX IF EXISTS idx_posts_slug;
DROP INDEX IF EXISTS idx_ak_post_id;
DROP INDEX IF EXISTS idx_hashtags_slug;
DROP INDEX IF EXISTS idx_hashtags_name;
DROP INDEX IF EXISTS idx_categories_slug;
