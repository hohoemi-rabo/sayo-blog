-- Ticket 41: 記事の出自を表す article_type
-- free = 紗代さんの自由記事 (既定) / mini = ミニ記事依頼 / long = ロング記事 (取材依頼, Ticket 42)
-- /admin/posts の一覧をタブ (自由/ミニ/ロング) で切り替えるための判別カラム。
-- 公開側は article_type に関係なく is_published で表示するため変更不要。

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS article_type text NOT NULL DEFAULT 'free';

ALTER TABLE posts
  DROP CONSTRAINT IF EXISTS posts_article_type_check;
ALTER TABLE posts
  ADD CONSTRAINT posts_article_type_check
  CHECK (article_type IN ('free', 'mini', 'long'));

COMMENT ON COLUMN posts.article_type IS '記事の出自: free=自由記事 / mini=ミニ記事依頼 / long=ロング記事(取材)。一覧タブ切替用。';

CREATE INDEX IF NOT EXISTS idx_posts_article_type ON posts (article_type);

-- 既存のミニ記事 (情報窓口の依頼から生成済み) を mini に移行
UPDATE posts
SET article_type = 'mini'
WHERE id IN (
  SELECT generated_post_id
  FROM mini_inquiries
  WHERE generated_post_id IS NOT NULL
);
