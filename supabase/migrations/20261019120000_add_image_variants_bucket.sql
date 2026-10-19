-- 画像の縮小版 (WebP) の置き場。/api/img が初回アクセス時に作って保存する。
-- Vercel Hobby の画像最適化 (月 5,000 変換) を超えて画像が 402 で出なくなったための自前化 (2026-10)。
-- 公開バケットなので /object/public/ からの読み取りに SELECT ポリシーは要らない (一覧させないため作らない)。
-- 書き込みは service role (RLS をバイパス) だけ。
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('image-variants', 'image-variants', true, 5242880, ARRAY['image/webp'])
ON CONFLICT (id) DO NOTHING;
