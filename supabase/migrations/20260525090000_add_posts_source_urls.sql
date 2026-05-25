-- Ticket 41: ミニ記事の元 SNS URL を保持するカラム
-- ミニ記事生成時に mini_inquiries.sns_urls を posts.source_urls へ控える。
-- クレジット表記は付けないが、後から元情報を確認できるよう内部保持する。
ALTER TABLE posts ADD COLUMN IF NOT EXISTS source_urls text[];

COMMENT ON COLUMN posts.source_urls IS 'ミニ記事の元 SNS URL（情報窓口フォーム由来）。クレジット表記には使わず内部参照用。';
