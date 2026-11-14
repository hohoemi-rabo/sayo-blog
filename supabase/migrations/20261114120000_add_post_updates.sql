-- Ticket 46: 記事の更新履歴
-- 同じ記事 (同じ URL) に季節の情報などを書き足したとき、「いつ・何を更新したか」を 1 行ずつ残す。
-- 公開ページの「最終更新」・dateModified・サイトマップの lastmod はこの履歴の最新日付を使う
-- (誤字直しの保存では変わらないようにするため。posts.updated_at は管理用にそのまま残す)。
-- 既存データには触れない (テーブルを足すだけ)。

create table if not exists public.post_updates (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  -- 日本時間の日付。時刻は要らない (画面にも日付しか出さない)
  updated_on date not null,
  note text not null,
  created_at timestamptz not null default now(),
  constraint post_updates_note_length check (char_length(btrim(note)) between 1 and 100)
);

-- 記事ページ (post_id で引く) と「最近更新された記事」(日付の新しい順) の両方に使う
create index if not exists idx_post_updates_post_id on public.post_updates (post_id);
create index if not exists idx_post_updates_updated_on on public.post_updates (updated_on desc);

alter table public.post_updates enable row level security;

-- 公開側 (anon) は公開中の記事の履歴だけ読める (下書きのメモを外に出さない)
drop policy if exists "Public can view updates of published posts" on public.post_updates;
create policy "Public can view updates of published posts"
  on public.post_updates for select to anon
  using (exists (
    select 1 from public.posts p where p.id = post_updates.post_id and p.is_published = true
  ));

-- 書き込みは管理画面の service role (RLS バイパス)。authenticated は Ticket 38 用 (他テーブルと同じ)
drop policy if exists "Authenticated users can do everything with post_updates" on public.post_updates;
create policy "Authenticated users can do everything with post_updates"
  on public.post_updates for all to authenticated using (true) with check (true);
