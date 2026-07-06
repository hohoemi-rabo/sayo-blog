-- Postgres best-practices hardening (Supabase advisor + supabase-postgres-best-practices skill)
--
-- 1) 管理専用 RPC の EXECUTE を anon/authenticated から剥奪
--    (アプリは service role からしか呼ばない。anon 実行可のままだと
--     AI 利用統計・ユーザークエリ・ストレージ一覧が誰でも読めてしまう)
-- 2) ai_usage_logs の匿名 INSERT ポリシー (WITH CHECK true) を削除
--    (挿入は log_ai_usage RPC = service role 経由のみ)
-- 3) 全アプリ関数の search_path を固定 (search_path hijack 対策。
--    match_articles は vector 演算子が extensions スキーマにあるため
--    public, extensions の 2 つを指定 — 他も同じ設定で統一)
-- 4) RLS ポリシーを TO でロールスコープ化
--    (全ポリシーが TO public だったため、公開サイトの anon クエリが
--     行ごとに管理ポリシー + 公開ポリシーの 2 本を評価していた。
--     管理系 ALL → TO authenticated / 公開 SELECT → TO anon に分離。
--     管理画面は service role (RLS バイパス) なので挙動変更なし)
-- 5) FK インデックス追加 (mini/long_inquiries.generated_post_id) と
--    死んだインデックス削除 (idx_categories_parent_id — カテゴリはフラット化済み)

-- ============================================================
-- 1. 管理専用 SECURITY DEFINER 関数: anon/authenticated から EXECUTE 剥奪
-- ============================================================
revoke execute on function public.check_usage_limit(text) from public, anon, authenticated;
revoke execute on function public.log_ai_usage(text, text, integer, integer, jsonb) from public, anon, authenticated;
revoke execute on function public.get_today_usage_stats() from public, anon, authenticated;
revoke execute on function public.get_monthly_usage_stats() from public, anon, authenticated;
revoke execute on function public.get_daily_usage_breakdown() from public, anon, authenticated;
revoke execute on function public.get_top_queries(integer) from public, anon, authenticated;
revoke execute on function public.list_storage_objects(text) from public, anon, authenticated;
revoke execute on function public.match_articles(extensions.vector, double precision, integer) from public, anon, authenticated;

grant execute on function public.check_usage_limit(text) to service_role;
grant execute on function public.log_ai_usage(text, text, integer, integer, jsonb) to service_role;
grant execute on function public.get_today_usage_stats() to service_role;
grant execute on function public.get_monthly_usage_stats() to service_role;
grant execute on function public.get_daily_usage_breakdown() to service_role;
grant execute on function public.get_top_queries(integer) to service_role;
grant execute on function public.list_storage_objects(text) to service_role;
grant execute on function public.match_articles(extensions.vector, double precision, integer) to service_role;

-- 公開機能で anon キーから呼ぶ RPC はそのまま:
-- increment_post_view_count / increment_reaction_count / decrement_reaction_count /
-- get_gallery_images / search_posts / search_suggestions

-- ============================================================
-- 2. ai_usage_logs の匿名 INSERT ポリシー削除
-- ============================================================
drop policy if exists "Anyone can insert usage logs" on public.ai_usage_logs;

-- ============================================================
-- 3. search_path 固定 (advisor: function_search_path_mutable の 13 関数)
-- ============================================================
alter function public.update_updated_at_column() set search_path = public, extensions;
alter function public.update_hashtag_count() set search_path = public, extensions;
alter function public.increment_post_view_count(text) set search_path = public, extensions;
alter function public.increment_reaction_count(uuid, text) set search_path = public, extensions;
alter function public.decrement_reaction_count(uuid, text) set search_path = public, extensions;
alter function public.search_posts(text, integer, integer) set search_path = public, extensions;
alter function public.search_suggestions(text) set search_path = public, extensions;
alter function public.list_storage_objects(text) set search_path = public, extensions;
alter function public.get_today_usage_stats() set search_path = public, extensions;
alter function public.get_monthly_usage_stats() set search_path = public, extensions;
alter function public.get_daily_usage_breakdown() set search_path = public, extensions;
alter function public.get_top_queries(integer) set search_path = public, extensions;
alter function public.match_articles(extensions.vector, double precision, integer) set search_path = public, extensions;

-- ============================================================
-- 4. RLS ポリシーのロールスコープ化
--    管理系 ALL: TO authenticated + true (auth.role() 呼び出し自体が不要になる)
--    公開 SELECT: TO anon (元の条件は維持)
-- ============================================================

-- posts
drop policy if exists "Authenticated users can do everything with posts" on public.posts;
create policy "Authenticated users can do everything with posts"
  on public.posts for all to authenticated using (true) with check (true);
drop policy if exists "Public can view published posts" on public.posts;
create policy "Public can view published posts"
  on public.posts for select to anon using (is_published = true);

-- categories
drop policy if exists "Authenticated users can do everything with categories" on public.categories;
create policy "Authenticated users can do everything with categories"
  on public.categories for all to authenticated using (true) with check (true);
drop policy if exists "Public can view active categories" on public.categories;
create policy "Public can view active categories"
  on public.categories for select to anon using (is_active = true);

-- hashtags
drop policy if exists "Authenticated users can do everything with hashtags" on public.hashtags;
create policy "Authenticated users can do everything with hashtags"
  on public.hashtags for all to authenticated using (true) with check (true);
drop policy if exists "Public can view all hashtags" on public.hashtags;
create policy "Public can view all hashtags"
  on public.hashtags for select to anon using (true);

-- post_categories
drop policy if exists "Authenticated users can do everything with post_categories" on public.post_categories;
create policy "Authenticated users can do everything with post_categories"
  on public.post_categories for all to authenticated using (true) with check (true);
drop policy if exists "Public can view post_categories" on public.post_categories;
create policy "Public can view post_categories"
  on public.post_categories for select to anon using (true);

-- post_hashtags
drop policy if exists "Authenticated users can do everything with post_hashtags" on public.post_hashtags;
create policy "Authenticated users can do everything with post_hashtags"
  on public.post_hashtags for all to authenticated using (true) with check (true);
drop policy if exists "Public can view post_hashtags" on public.post_hashtags;
create policy "Public can view post_hashtags"
  on public.post_hashtags for select to anon using (true);

-- reactions
drop policy if exists "Authenticated users can manage reactions" on public.reactions;
create policy "Authenticated users can manage reactions"
  on public.reactions for all to authenticated using (true) with check (true);
drop policy if exists "reactions_select" on public.reactions;
create policy "reactions_select"
  on public.reactions for select to anon using (true);

-- post_images
drop policy if exists "post_images authenticated all" on public.post_images;
create policy "post_images authenticated all"
  on public.post_images for all to authenticated using (true) with check (true);
drop policy if exists "post_images public read" on public.post_images;
create policy "post_images public read"
  on public.post_images for select to anon
  using (post_is_published = true and is_visible = true);

-- ai_prompt_tags
drop policy if exists "Authenticated users can manage tags" on public.ai_prompt_tags;
create policy "Authenticated users can manage tags"
  on public.ai_prompt_tags for all to authenticated using (true) with check (true);
drop policy if exists "Public can view active tags" on public.ai_prompt_tags;
create policy "Public can view active tags"
  on public.ai_prompt_tags for select to anon using (is_active = true);

-- ai_usage_limits
drop policy if exists "Authenticated users can manage usage limits" on public.ai_usage_limits;
create policy "Authenticated users can manage usage limits"
  on public.ai_usage_limits for all to authenticated using (true) with check (true);
drop policy if exists "Public can read usage limits" on public.ai_usage_limits;
create policy "Public can read usage limits"
  on public.ai_usage_limits for select to anon using (true);

-- article_knowledge
drop policy if exists "Authenticated users can manage knowledge" on public.article_knowledge;
create policy "Authenticated users can manage knowledge"
  on public.article_knowledge for all to authenticated using (true) with check (true);
drop policy if exists "Public can view active knowledge" on public.article_knowledge;
create policy "Public can view active knowledge"
  on public.article_knowledge for select to anon using (is_active = true);

-- ai_usage_logs (SELECT のみ。INSERT は log_ai_usage RPC 経由)
drop policy if exists "Authenticated users can view usage logs" on public.ai_usage_logs;
create policy "Authenticated users can view usage logs"
  on public.ai_usage_logs for select to authenticated using (true);

-- ig_posts / ig_settings / mini_inquiries / long_inquiries (管理専用)
drop policy if exists "Authenticated users can manage ig_posts" on public.ig_posts;
create policy "Authenticated users can manage ig_posts"
  on public.ig_posts for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can manage ig_settings" on public.ig_settings;
create policy "Authenticated users can manage ig_settings"
  on public.ig_settings for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can manage mini_inquiries" on public.mini_inquiries;
create policy "Authenticated users can manage mini_inquiries"
  on public.mini_inquiries for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can manage long_inquiries" on public.long_inquiries;
create policy "Authenticated users can manage long_inquiries"
  on public.long_inquiries for all to authenticated using (true) with check (true);

-- ============================================================
-- 5. FK インデックス追加 + 死んだインデックス削除
-- ============================================================
create index if not exists idx_mini_inquiries_generated_post_id
  on public.mini_inquiries (generated_post_id) where generated_post_id is not null;
create index if not exists idx_long_inquiries_generated_post_id
  on public.long_inquiries (generated_post_id) where generated_post_id is not null;

-- カテゴリはフラット構造化済みで parent_id は使われていない
drop index if exists public.idx_categories_parent_id;
