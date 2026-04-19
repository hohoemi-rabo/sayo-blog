-- Phase 3: Instagram Integration Tables
-- Adds 4 tables for blog<->Instagram bidirectional linkage
-- All tables: RLS enabled, authenticated-only ALL policy, updated_at trigger

-- ============================================================
-- 1. ig_posts  (Blog -> IG draft/publish tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS ig_posts (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id                uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  caption                text NOT NULL,
  hashtags               text[] NOT NULL DEFAULT '{}',
  image_url              text,
  sequence_number        integer NOT NULL DEFAULT 1,
  status                 text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'manual_published')),
  instagram_media_id     text,
  instagram_published_at timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ig_posts_post_id ON ig_posts(post_id);
CREATE INDEX IF NOT EXISTS idx_ig_posts_status  ON ig_posts(status);

ALTER TABLE ig_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage ig_posts" ON ig_posts;
CREATE POLICY "Authenticated users can manage ig_posts" ON ig_posts
  FOR ALL USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');

DROP TRIGGER IF EXISTS trg_ig_posts_updated_at ON ig_posts;
CREATE TRIGGER trg_ig_posts_updated_at
  BEFORE UPDATE ON ig_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. ig_sources  (IG accounts we pull posts from)
-- ============================================================
CREATE TABLE IF NOT EXISTS ig_sources (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ig_username       text NOT NULL UNIQUE,
  display_name      text NOT NULL,
  category_slug     text,
  permission_status text NOT NULL DEFAULT 'not_requested'
    CHECK (permission_status IN ('not_requested', 'requested', 'approved', 'denied')),
  permission_date   date,
  permission_memo   text,
  contact_info      text,
  is_active         boolean NOT NULL DEFAULT false,
  last_fetched_at   timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ig_sources_permission ON ig_sources(permission_status);
CREATE INDEX IF NOT EXISTS idx_ig_sources_active     ON ig_sources(is_active);

ALTER TABLE ig_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage ig_sources" ON ig_sources;
CREATE POLICY "Authenticated users can manage ig_sources" ON ig_sources
  FOR ALL USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');

DROP TRIGGER IF EXISTS trg_ig_sources_updated_at ON ig_sources;
CREATE TRIGGER trg_ig_sources_updated_at
  BEFORE UPDATE ON ig_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 3. ig_imported_posts  (IG posts pulled from sources)
-- ============================================================
CREATE TABLE IF NOT EXISTS ig_imported_posts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id         uuid NOT NULL REFERENCES ig_sources(id) ON DELETE CASCADE,
  ig_post_id        text NOT NULL UNIQUE,
  caption           text,
  image_urls        text[],
  ig_posted_at      timestamptz,
  likes_count       integer,
  ig_post_url       text,
  status            text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'published', 'skipped')),
  generated_post_id uuid REFERENCES posts(id) ON DELETE SET NULL,
  stored_image_urls text[],
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ig_imported_source ON ig_imported_posts(source_id);
CREATE INDEX IF NOT EXISTS idx_ig_imported_status ON ig_imported_posts(status);
-- ig_post_id is auto-indexed via UNIQUE constraint

ALTER TABLE ig_imported_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage ig_imported_posts" ON ig_imported_posts;
CREATE POLICY "Authenticated users can manage ig_imported_posts" ON ig_imported_posts
  FOR ALL USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');

DROP TRIGGER IF EXISTS trg_ig_imported_posts_updated_at ON ig_imported_posts;
CREATE TRIGGER trg_ig_imported_posts_updated_at
  BEFORE UPDATE ON ig_imported_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 4. ig_settings  (key-value config store)
-- ============================================================
CREATE TABLE IF NOT EXISTS ig_settings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key   text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ig_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage ig_settings" ON ig_settings;
CREATE POLICY "Authenticated users can manage ig_settings" ON ig_settings
  FOR ALL USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');

DROP TRIGGER IF EXISTS trg_ig_settings_updated_at ON ig_settings;
CREATE TRIGGER trg_ig_settings_updated_at
  BEFORE UPDATE ON ig_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 5. Initial data for ig_settings
-- ============================================================
INSERT INTO ig_settings (setting_key, setting_value) VALUES
  ('caption_config', jsonb_build_object(
    'required_hashtags', jsonb_build_array('#長野県飯田市', '#sayosjournalブログ記事'),
    'min_length', 200,
    'max_length', 400,
    'generated_hashtag_count', 8
  )),
  ('auto_generate', jsonb_build_object(
    'enabled', true,
    'count_on_publish', 1
  )),
  ('instagram_account', jsonb_build_object(
    'username', 'fune.iida.toyooka.odekake',
    'facebook_page_connected', true
  ))
ON CONFLICT (setting_key) DO NOTHING;
