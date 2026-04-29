-- Phase 3B Ticket 35: Cowork CSV 取り込みで使う追加カラム
-- comment_count: CSV の comment_count 列。Cowork 取り込み時の IG コメント数。
-- selected_image_indexes: 記事化時に採用するカルーセル画像のインデックス
--   (0-origin)。Null = 全画像採用。Ticket 36 の選択 UI で更新される。

ALTER TABLE ig_imported_posts
  ADD COLUMN IF NOT EXISTS comment_count integer,
  ADD COLUMN IF NOT EXISTS selected_image_indexes integer[];

COMMENT ON COLUMN ig_imported_posts.comment_count
  IS 'Cowork 取り込み時の IG コメント数 (CSV の comment_count 列由来)';

COMMENT ON COLUMN ig_imported_posts.selected_image_indexes
  IS '記事化時に採用するカルーセル画像のインデックス (0-origin、Null=全画像採用、Ticket 36 で更新)';
