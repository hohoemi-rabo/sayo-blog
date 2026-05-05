-- Ticket 37: 飯田下伊那のイベント情報を構造化抽出して posts に保存できるようにする。
-- AI 記事生成 (ig-article-generator) で Gemini が抽出した event 情報を埋める他、
-- 管理画面の EventInfoSection で手動編集も可能にする。

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS is_event boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS event_date_start date,
  ADD COLUMN IF NOT EXISTS event_date_end date,
  ADD COLUMN IF NOT EXISTS event_time_start text,
  ADD COLUMN IF NOT EXISTS event_time_end text,
  ADD COLUMN IF NOT EXISTS event_venue text,
  ADD COLUMN IF NOT EXISTS event_address text,
  ADD COLUMN IF NOT EXISTS event_fee text,
  ADD COLUMN IF NOT EXISTS event_url text;

CREATE INDEX IF NOT EXISTS idx_posts_event_date_partial
  ON posts (event_date_start) WHERE is_event = true;

COMMENT ON COLUMN posts.is_event IS 'true でイベント記事として扱う（カード表示で日付バッジ大きく表示予定 / Ticket 37）';
COMMENT ON COLUMN posts.event_date_start IS '開催開始日 ISO YYYY-MM-DD（単日なら end は null）';
COMMENT ON COLUMN posts.event_date_end IS '複数日開催時の終了日';
COMMENT ON COLUMN posts.event_time_start IS '開始時刻（"10:00", "10時〜" 等の自由記述）';
COMMENT ON COLUMN posts.event_time_end IS '終了時刻（自由記述）';
COMMENT ON COLUMN posts.event_venue IS '会場名（例: "丘の上結いスクエア"）';
COMMENT ON COLUMN posts.event_address IS '住所（あれば）';
COMMENT ON COLUMN posts.event_fee IS '料金（"無料" / "500円" / "大人 1000円・子供 500円" 等の自由表記）';
COMMENT ON COLUMN posts.event_url IS '公式サイト or 申込フォーム URL（あれば）';
