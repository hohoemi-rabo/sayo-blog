-- Ticket 45: 関連記事の手動選択
-- 記事ごとに最大 3 件、紗代さんが関連記事を選べるようにする。
-- 選ばなかった枠は公開側 (RelatedArticles) が自動選定で埋める。
-- 選んだ記事が後で非公開 / 終了イベントになっても行は消さない (表示時に外す)。
-- 既存データには触れない (テーブルを足すだけ)。

create table if not exists public.post_related_posts (
  post_id uuid not null references public.posts(id) on delete cascade,
  related_post_id uuid not null references public.posts(id) on delete cascade,
  position smallint not null,
  created_at timestamptz not null default now(),
  primary key (post_id, related_post_id),
  constraint post_related_posts_position_unique unique (post_id, position),
  constraint post_related_posts_not_self check (post_id <> related_post_id),
  constraint post_related_posts_position_range check (position between 0 and 2)
);

-- PK / UNIQUE の先頭は post_id なので post_id 用の索引は不要。
-- related_post_id は FK の ON DELETE CASCADE 用に索引を張る。
create index if not exists idx_post_related_posts_related_post_id
  on public.post_related_posts (related_post_id);

alter table public.post_related_posts enable row level security;

-- 公開側 (anon) は読むだけ。どの記事が公開中かの判定は posts 側の RLS とアプリで行う
drop policy if exists "Public can view post_related_posts" on public.post_related_posts;
create policy "Public can view post_related_posts"
  on public.post_related_posts for select to anon using (true);

-- 書き込みは管理画面の service role (RLS バイパス)。authenticated は Ticket 38 用 (他テーブルと同じ)
drop policy if exists "Authenticated users can do everything with post_related_posts" on public.post_related_posts;
create policy "Authenticated users can do everything with post_related_posts"
  on public.post_related_posts for all to authenticated using (true) with check (true);
