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
1. **posts** - id, title, slug, content (HTML), excerpt, thumbnail_url, view_count, published_at, is_published, is_featured, event_ended (boolean: イベント記事の終了済みフラグ — true で公開側のサムネ/ヒーローを白黒化 + 終了案内オーバーレイを表示), created_at, updated_at, search_vector (tsvector, generated)
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
12. **ig_sources** - ig_username UNIQUE, display_name, category_slug, permission_status (not_requested/requested/approved/denied), permission_date, is_active, last_fetched_at
13. **ig_imported_posts** - source_id FK (CASCADE), ig_post_id UNIQUE, caption, image_urls text[], status (pending/processing/published/skipped), generated_post_id FK posts (SET NULL), stored_image_urls text[]
14. **ig_settings** - setting_key UNIQUE, setting_value jsonb (caption_config / auto_generate / instagram_account)

All Phase 3 tables: RLS enabled, authenticated-only ALL policy (no anon access), `update_updated_at_column()` trigger applied.

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

## RLS (Row Level Security)

All 10 tables have RLS enabled.

### RLS Performance Rule
**ALWAYS** wrap `auth.role()` / `auth.uid()` in a SELECT subquery to prevent per-row re-evaluation:
```sql
-- ✅ Correct (evaluated once per request)
CREATE POLICY "..." ON posts USING ((select auth.role()) = 'authenticated');

-- ❌ Wrong (re-evaluated for every row)
CREATE POLICY "..." ON posts USING (auth.role() = 'authenticated');
```

### Current Policies Pattern
- **Public tables** (posts, categories, etc.): `SELECT` for `is_published = true` or `is_active = true`
- **Authenticated**: `ALL` with `(select auth.role()) = 'authenticated'`
- **reactions**: `SELECT` for anyone, mutations only via SECURITY DEFINER RPCs (no direct INSERT/UPDATE for anon)

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
| `ig-imported` | yes | IG→ブログ方向の取得画像 (Phase 3B) |

Phase 3 buckets: SELECT 全ユーザー許可、INSERT/UPDATE/DELETE は `(select auth.role()) = 'authenticated'` 制限。

## MCP Setup

Project: `sayo-blog` (ID: `nkvohswifpmarobyrnbe`, Region: ap-northeast-1)
- Copy `.mcp.json.example` to `.mcp.json`
- Set `SUPABASE_ACCESS_TOKEN` in `~/.bashrc`
