---
paths:
  - "src/lib/supabase*"
  - "src/lib/types.ts"
  - "src/app/api/**"
  - "supabase/**"
  - "scripts/**"
---

# Database & Supabase Rules

## Supabase Client Factory

Three client types in `src/lib/supabase.ts`:
- `createClient()` - Basic client (no auth persistence) for Server Components and Routes
- `createServerClient()` - Cookie-based auth for authenticated Server Components
- `createAdminClient()` - Service role key for elevated operations

Browser-side: `src/lib/supabase-browser.ts` (singleton, prevents multiple instances)

## Database Schema

### Core Tables
1. **posts** - id, title, slug, content (HTML), excerpt, thumbnail_url, view_count, published_at, is_published, is_featured, event_ended (イベント開催回終了フラグ — 公開側のサムネ/ヒーローを白黒化 + 終了案内オーバーレイ), is_event (Ticket 37: イベント記事フラグ → カード表示で日付バッジ大きく表示する将来予定), event_date_start, event_date_end (date), event_time_start, event_time_end (text 自由記述), event_venue, event_address, event_fee, event_url (text), article_type (Ticket 41: free/mini/long, default free, CHECK + idx_posts_article_type — /admin/posts のタブ切替用), source_urls (text[] NULL, Ticket 41: ミニ記事の元 SNS URL), summary_short / summary_medium / summary_long (text NULL, AI 3段階要約 = さくっと/ほどよく/じっくり。未生成 NULL は公開側で自動非表示), created_at, updated_at, search_vector (tsvector, generated)
2. **categories** - id, name, slug, description, order_num (flat structure: gourmet, event, spot, culture, news)
3. **post_categories** - Many-to-many junction (CASCADE DELETE on both FKs)
4. **hashtags** - id, name, slug, count (auto-updated via triggers)
5. **post_hashtags** - Many-to-many junction (CASCADE DELETE on both FKs)
6. **reactions** - post_id FK (CASCADE), reaction_type (CHECK constraint), count, UNIQUE(post_id, reaction_type)

### Phase 2 Tables (AI Chat)
7. **article_knowledge** - post_id FK UNIQUE (CASCADE), slug, metadata (jsonb), content, embedding vector(3072), is_active
8. **ai_prompt_tags** - label, prompt, tag_type (purpose/area/scene), order_num, is_active
9. **ai_usage_logs** - session_id, query, token_input, token_output, matched_articles (jsonb)
10. **ai_usage_limits** - limit_type (daily_user/monthly_site), limit_value, current_value, reset_at

### Phase 3 Tables (Instagram Integration)
11. **ig_posts** - post_id FK (CASCADE), caption, hashtags text[], image_url, sequence_number, status (draft/published/manual_published), instagram_media_id, instagram_published_at
12. **ig_settings** - setting_key UNIQUE, setting_value jsonb (caption_config / auto_generate / instagram_account)

> **削除済み (Phase 4 / Ticket 40)**: `ig_sources` と `ig_imported_posts` は Cowork CSV 取り込みフロー廃止に伴い DROP。情報窓口フォーム (下記 Phase 4) に置き換え。`src/lib/ig-article-*` は Ticket 41 のミニ記事生成で再利用するため残存。

### Phase 4 Tables (情報窓口フォーム)
13. **mini_inquiries** - sns_urls text[] (**必須/最大5** — 紹介したい SNS 投稿の URL。ターゲット=SNS 投稿者。`message` 自由記述欄は 2026-07-07 に廃止 = migration `20260707120000_drop_mini_inquiries_message.sql`), inquiry_type (event/shop/group/other) + inquiry_type_other, phone (必須), email, publish_preference (anytime/by_date/in_month) + publish_target_date/month, image_urls text[] (最大2), consent, status (pending/generating/published/skipped), admin_notes, generated_post_id FK posts (SET NULL)
14. **long_inquiries** - client_type (individual/organization/group), individual_name/organization_name/department_name/group_name, contact_person (必須), address (必須), interview_content (必須), publish_preference/interview_preference (free text), phone (必須), email, consent, status (pending/contacted/scheduled/interviewed/writing/published/cancelled), admin_notes, generated_post_id FK posts (SET NULL), scheduled_at, fee_amount (円)

### Gallery Table (画像ギャラリー)
15. **post_images** - post_id FK posts (CASCADE), image_url, caption (figcaption), alt, position (記事内出現順, サムネは -1), is_thumbnail, is_visible (公開ギャラリー表示 ON/OFF, default true), is_featured (ピン留め優先表示), **post_is_published / post_published_at (非正規化: 記事の公開状態・公開日時)**, UNIQUE(post_id, image_url)
    - 本文 HTML + サムネから抽出 (`extractPostImages`) し `syncPostImages` が delete→insert で同期 (冪等)。同期は**アプリ層 (Server Action) 限定**、DB トリガで HTML パースはしない。
    - 公開状態を非正規化するのは、ギャラリー取得を posts 結合なしでフラットに済ませ部分インデックスを効かせるため (既存 `idx_posts_*_partial` と同じ思想)。
    - RLS: 匿名 SELECT は `post_is_published = true AND is_visible = true` のみ / authenticated は ALL。公開 RPC でも WHERE 固定し二重で担保。

All Phase 3 / Phase 4 tables: RLS enabled, authenticated-only ALL policy (no anon access), `update_updated_at_column()` trigger applied.

> **inquiries の書き込み方針**: 公開フォーム送信は Server Action 内で `createAdminClient()` (service role) を使い RLS をバイパスして INSERT する。匿名 INSERT ポリシーは付けない (Zod 検証 + Vercel BotID + レート制限を Server Action 側で実施予定)。

### RPC Functions
- `increment_post_view_count(post_slug)` — SECURITY DEFINER
- `increment_reaction_count(p_post_id, p_reaction_type)` — SECURITY DEFINER, UPSERT pattern
- `decrement_reaction_count(p_post_id, p_reaction_type)` — SECURITY DEFINER
- `search_posts(search_query, result_limit, result_offset)` — STABLE, trigram + full-text
- `search_suggestions(search_query)` — STABLE, top 5 results
- `match_articles(query_embedding, match_threshold, match_count)` — vector similarity search
- `check_usage_limit(p_session_id)` — SECURITY DEFINER, returns jsonb
- `log_ai_usage(...)` — SECURITY DEFINER
- `get_today_usage_stats()` — SECURITY DEFINER, STABLE
- `get_monthly_usage_stats()` — SECURITY DEFINER, STABLE
- `get_daily_usage_breakdown()` — SECURITY DEFINER, STABLE
- `get_top_queries(p_limit)` — SECURITY DEFINER, STABLE
- `get_gallery_images(p_limit, p_offset, p_seed)` — SECURITY DEFINER, STABLE。post_images ⨝ posts ⨝ 主カテゴリ (LATERAL, order_num 最小)。公開済み & 表示ON を WHERE 固定し、画像URL/caption/alt/is_featured + リンク用 slug/category_slug/title を返す。並び: `is_featured DESC, md5(pi.id::text || p_seed), pi.id`（ピン留め → シード付きランダム → タイブレーク）。`p_seed text DEFAULT ''` で旧2引数呼び出しも後方互換。/gallery は force-dynamic で訪問ごとにシードを生成し、初回ページと /api/gallery で共有してページングを安定させつつリロードのたびに並びを変える (migration `20260630120000_gallery_random_order.sql`)

## RLS (Row Level Security)

All 15 tables have RLS enabled.

### RLS Performance Rule
**ALWAYS** wrap `auth.role()` / `auth.uid()` in a SELECT subquery to prevent per-row re-evaluation:
```sql
-- ✅ Correct (evaluated once per request)
CREATE POLICY "..." ON posts USING ((select auth.role()) = 'authenticated');

-- ❌ Wrong (re-evaluated for every row)
CREATE POLICY "..." ON posts USING (auth.role() = 'authenticated');
```

### Current Policies Pattern (2026-07-06 ロールスコープ化済み)
全ポリシーは `TO` 句でロールにスコープする (migration `20260706150000_postgres_best_practices_hardening.sql`)。
`TO` なし (= 全ロール) だと anon クエリが管理ポリシーまで毎行評価する (advisor: multiple_permissive_policies)。
- **公開 SELECT**: `FOR SELECT TO anon USING (is_published = true)` 等 (条件は従来通り)
- **管理系**: `FOR ALL TO authenticated USING (true) WITH CHECK (true)` — TO でスコープ済みなので qual の `auth.role()` チェックは不要。実運用は service role (RLS バイパス) で、authenticated は将来の Ticket 38 用
- **reactions**: `SELECT TO anon`、mutations は SECURITY DEFINER RPC 経由のみ (直接 INSERT/UPDATE 不可)
- **ai_usage_logs**: INSERT は `log_ai_usage` RPC 経由のみ (匿名 INSERT ポリシーは削除済み)

## Index Strategy

### Composite Index (most common query pattern)
```sql
idx_posts_published_composite ON posts (is_published, published_at DESC)
```

### Partial Indexes (only published posts — excludes drafts)
```sql
idx_posts_published_at_partial ON posts (published_at DESC) WHERE is_published = true
idx_posts_view_count_partial   ON posts (view_count DESC) WHERE is_published = true
idx_posts_slug_partial         ON posts (slug) WHERE is_published = true
idx_posts_event_date_partial   ON posts (event_date_start) WHERE is_event = true  -- Ticket 37
idx_post_images_gallery_partial ON post_images (is_featured DESC, post_published_at DESC, position ASC) WHERE post_is_published AND is_visible  -- 公開ギャラリー
idx_post_images_post_id        ON post_images (post_id)  -- FK 用
```

### Full-Text Search Indexes (GIN)
```sql
idx_posts_search_vector ON posts USING gin (search_vector)
idx_posts_title_trgm    ON posts USING gin (title gin_trgm_ops)
idx_posts_excerpt_trgm  ON posts USING gin (excerpt gin_trgm_ops)
```

### Index Rules
- Do NOT create B-tree indexes that duplicate UNIQUE constraint indexes
- Use partial indexes with `WHERE is_published = true` for public-facing queries
- FK columns on junction tables are indexed (post_id, category_id, hashtag_id)

## RPC Function Grants & search_path (2026-07-06)

migration `20260706150000_postgres_best_practices_hardening.sql` で適用:
- **管理専用 RPC は anon/authenticated から EXECUTE 剥奪済み** (service role のみ):
  `check_usage_limit` / `log_ai_usage` / `get_today_usage_stats` / `get_monthly_usage_stats` /
  `get_daily_usage_breakdown` / `get_top_queries` / `list_storage_objects` / `match_articles`
- **公開 RPC (anon キーで呼ぶ)**: `increment_post_view_count` / `increment_reaction_count` /
  `decrement_reaction_count` / `get_gallery_images` / `search_posts` / `search_suggestions`
- 全アプリ関数は `SET search_path = public, extensions` を固定済み (hijack 対策。
  `extensions` は vector 演算子 `<=>` の解決に必要)。**新しい関数を作るときも必ず同様に固定する**
- 新しい管理専用 RPC を作ったら同様に `REVOKE EXECUTE ... FROM public, anon, authenticated` +
  `GRANT EXECUTE ... TO service_role` すること

## RPC Function Volatility

- **VOLATILE** (default): Functions that write data (`log_ai_usage`, `increment_*`, `check_usage_limit`)
- **STABLE**: Read-only functions within a transaction (`search_posts`, `search_suggestions`, analytics functions)
- **IMMUTABLE**: Never changes (not currently used)

Mark read-only RPCs as `STABLE` for query planner optimization.

## Data Fetching Pattern

```typescript
const { data: posts } = await supabase
  .from('posts')
  .select(`
    *,
    post_categories!inner(categories!inner(slug, name, parent_id)),
    post_hashtags(hashtags(name, slug))
  `)
  .eq('is_published', true)
  .order('published_at', { ascending: false });
```

## Type Safety

Use `PostWithRelations` for components needing nested data:
```typescript
interface PostCardProps {
  post: PostWithRelations  // NOT Post
}
```

## Known Issues

### Supabase Connection "Retrying 1/3..." Messages
- Cosmetic during Next.js compilation, not actual connectivity issues
- Anti-patterns to avoid:
  - ❌ Custom `Keep-Alive` headers
  - ❌ Complex `unstable_cache` wrappers
  - ❌ Custom timeout signals in fetch wrappers

## Storage Buckets

| Bucket | Public | Purpose |
|--------|--------|---------|
| `thumbnails` | yes | 記事サムネイル + Tiptap 本文画像 (`/YYYY/MM/{timestamp}.{ext}`) |
| `ig-posts` | yes | ブログ→IG 方向の投稿画像 (Phase 3A) |
| `inquiry-images` | yes | 情報窓口フォーム添付画像 (Phase 4, `mini/{id}/{n}.{ext}` / `long/{id}/{n}.{ext}`) |

Phase 3 / Phase 4 buckets: SELECT 全ユーザー許可、INSERT/UPDATE/DELETE は `(select auth.role()) = 'authenticated'` 制限。

> **削除済み (Ticket 40)**: `ig-imported` バケットは Storage API (empty → delete) で削除。storage.objects/buckets への直接 SQL DELETE は `protect_delete` トリガーで禁止されているため、マイグレーションではなく Storage API で消す。

## MCP Setup

Project: `sayo-blog` (ID: `nkvohswifpmarobyrnbe`, Region: ap-northeast-1)
- Copy `.mcp.json.example` to `.mcp.json`
- Set `SUPABASE_ACCESS_TOKEN` in `~/.bashrc`
