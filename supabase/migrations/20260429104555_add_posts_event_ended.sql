ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS event_ended boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN posts.event_ended
  IS 'true の場合、サムネイル + ヒーロー画像を白黒化 + 終了案内オーバーレイを重ねる（イベント記事の終了済み表示）。Ticket 37 で event JSON カラム導入後は end_date から自動算出に切り替え予定。';
