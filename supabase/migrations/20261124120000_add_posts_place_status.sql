-- 記事で紹介したお店・場所の今の状態 (2026-11-24, 紗代さんの要望)
-- open = 通常 / closed = 閉店 / relocated = 移転
-- イベント終了 (event_ended) とは別の欄 (閉店したお店のイベント記事、のように両方付くことがある)。
-- NULL ではなく 'open' を既定にしているのは、PostgREST の neq('closed') が NULL の行も落とすため。
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS place_status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS relocation_note text,
  ADD COLUMN IF NOT EXISTS relocation_url text;

ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_place_status_check;
ALTER TABLE posts
  ADD CONSTRAINT posts_place_status_check CHECK (place_status IN ('open', 'closed', 'relocated'));

COMMENT ON COLUMN posts.place_status IS
  '紹介したお店・場所の状態: open / closed (閉店 = 白黒 + トップ・関連記事に出さない) / relocated (移転 = 印 + 移転先の案内)';
COMMENT ON COLUMN posts.relocation_note IS '移転先の一言 (例: 飯田市○○町へ移転しました)。移転のときだけ表示';
COMMENT ON COLUMN posts.relocation_url IS '移転先の案内ページ (http/https)。移転のときだけ表示';
