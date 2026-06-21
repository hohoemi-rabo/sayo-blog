-- 画像ギャラリー機能 (Gallery): 公開記事の画像を一覧する post_images テーブル
--
-- 本文 HTML + サムネから抽出した画像を保持する。post の公開状態/公開日時を非正規化して
-- (post_is_published / post_published_at)、ギャラリー取得を posts 結合なしでフラットに済ませ、
-- 部分インデックスを効かせる (既存 idx_posts_*_partial と同じ思想)。
-- 抽出・同期はアプリ層 (syncPostImages) が担当。DB トリガで HTML パースはしない。

CREATE TABLE IF NOT EXISTS post_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption text,
  alt text,
  position integer NOT NULL DEFAULT 0,        -- 記事内の出現順 (サムネは -1)
  is_thumbnail boolean NOT NULL DEFAULT false, -- 記事サムネ由来か
  is_visible boolean NOT NULL DEFAULT true,    -- 公開ギャラリーに出すか (管理者トグル)
  is_featured boolean NOT NULL DEFAULT false,  -- ピン留め優先表示 (管理者トグル)
  post_is_published boolean NOT NULL DEFAULT false, -- 非正規化: 記事の公開状態
  post_published_at timestamptz,                    -- 非正規化: 記事の公開日時 (並び順用)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT post_images_post_id_image_url_key UNIQUE (post_id, image_url)
);

COMMENT ON TABLE post_images IS '記事の画像をギャラリー表示するための抽出テーブル (本文 + サムネ)。同期は syncPostImages が担当。';

-- updated_at 自動更新トリガ (既存の共通関数を再利用)
DROP TRIGGER IF EXISTS set_post_images_updated_at ON post_images;
CREATE TRIGGER set_post_images_updated_at
  BEFORE UPDATE ON post_images
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- インデックス
-- 公開ギャラリー取得用の部分インデックス (並び順: ピン留め → 記事新着 → 記事内位置)
CREATE INDEX IF NOT EXISTS idx_post_images_gallery_partial
  ON post_images (is_featured DESC, post_published_at DESC, position ASC)
  WHERE post_is_published AND is_visible;
-- FK 用
CREATE INDEX IF NOT EXISTS idx_post_images_post_id ON post_images (post_id);

-- RLS: 既存 14 テーブルの方針に合わせる
ALTER TABLE post_images ENABLE ROW LEVEL SECURITY;

-- 匿名/全員: 公開済み記事 かつ 表示ON のみ SELECT 可
DROP POLICY IF EXISTS "post_images public read" ON post_images;
CREATE POLICY "post_images public read" ON post_images
  FOR SELECT
  USING (post_is_published = true AND is_visible = true);

-- 認証ユーザー: ALL
DROP POLICY IF EXISTS "post_images authenticated all" ON post_images;
CREATE POLICY "post_images authenticated all" ON post_images
  FOR ALL
  USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');

-- 公開ギャラリー取得 RPC: post_images ⨝ posts ⨝ 主カテゴリ。
-- 公開済み & 表示ON のみを SECURITY DEFINER 内の WHERE で固定し、リンク生成に必要な最小列を返す。
-- 主カテゴリ = order_num 最小の 1 件 (無ければカテゴリなし扱い)。
CREATE OR REPLACE FUNCTION get_gallery_images(p_limit integer, p_offset integer)
RETURNS TABLE (
  image_url text,
  caption text,
  alt text,
  is_featured boolean,
  post_published_at timestamptz,
  slug text,
  category_slug text,
  title text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pi.image_url,
    pi.caption,
    pi.alt,
    pi.is_featured,
    pi.post_published_at,
    p.slug,
    cat.category_slug,
    p.title
  FROM post_images pi
  JOIN posts p ON p.id = pi.post_id
  LEFT JOIN LATERAL (
    SELECT c.slug AS category_slug
    FROM post_categories pc
    JOIN categories c ON c.id = pc.category_id
    WHERE pc.post_id = p.id
    ORDER BY c.order_num ASC NULLS LAST
    LIMIT 1
  ) cat ON true
  WHERE pi.post_is_published = true
    AND pi.is_visible = true
  ORDER BY pi.is_featured DESC, pi.post_published_at DESC NULLS LAST, pi.position ASC
  LIMIT p_limit OFFSET p_offset;
$$;
