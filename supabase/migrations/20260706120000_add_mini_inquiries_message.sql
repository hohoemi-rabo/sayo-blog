-- ミニ記事フォームに「伝えたいこと」本文欄を追加。
-- SNS URL を任意化したことに伴い、URL が無い情報 (ご近所のちょっとした話など) を
-- 文章で受け取れるようにする。既存行は NULL (本文なし) 扱い。
alter table public.mini_inquiries
  add column if not exists message text;

comment on column public.mini_inquiries.message is
  '投稿者が入力した本文 (伝えたいこと)。SNS URL 任意化に伴う自由記述欄。NULL 可。';
