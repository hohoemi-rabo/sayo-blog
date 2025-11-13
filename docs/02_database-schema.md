# 02: Database Schema Implementation

## Overview

Create Supabase database schema with hierarchical categories, posts, hashtags, and relationships. Implement RLS policies, triggers, and indexes.

## Related Files

- `supabase/migrations/*.sql` - Migration files
- `src/lib/supabase-types.ts` - Generated TypeScript types
- REQUIREMENTS.md (Lines 402-749) - Database design specifications

## Technical Details

### Tables

1. **posts** - Main article table
2. **categories** - Hierarchical location categories (prefecture → city → district)
3. **post_categories** - Junction table (posts ↔ categories)
4. **hashtags** - Tag system
5. **post_hashtags** - Junction table (posts ↔ hashtags)
6. **reactions** (Phase 2) - Emoji reactions

### Key Features

- Self-referential categories with `parent_id`
- RLS policies for public/admin access
- Triggers for auto-updating `updated_at` and hashtag counts
- Indexes on slug, published_at, view_count

## Todo

### Create Tables

- [×] Create `posts` table with all fields
- [×] Add indexes to posts (slug, published_at, is_published, view_count)
- [×] Create `categories` table with self-reference
- [×] Add indexes to categories (slug, parent_id, order_num)
- [×] Create `post_categories` junction table
- [×] Create `hashtags` table
- [×] Add indexes to hashtags (name, slug, count)
- [×] Create `post_hashtags` junction table

### RLS Policies

- [×] Enable RLS on all tables
- [×] Policy: Public can SELECT published posts
- [×] Policy: Authenticated users can perform all operations
- [×] Policy: Public can SELECT active categories
- [×] Policy: Public can SELECT all hashtags

### Triggers & Functions

- [×] Create `update_updated_at_column()` function
- [×] Add trigger to posts table for updated_at
- [×] Add trigger to categories table for updated_at
- [×] Create `update_hashtag_count()` function
- [×] Add trigger to post_hashtags for hashtag count

### Test Data

- [×] Insert test categories (長野県 → 飯田市 → 上郷)
- [×] Insert test hashtags (飯田りんご, りんご狩り, etc.)
- [×] Insert 3-5 test posts with relationships
- [×] Verify RLS policies work correctly
- [×] Test category hierarchy queries
- [×] Test hashtag count auto-update

### Generate Types

- [ ] Generate TypeScript types: `npx supabase gen types typescript`
- [ ] Save to `src/lib/supabase-types.ts`

## SQL Example

```sql
-- Create posts table
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  thumbnail_url TEXT,
  view_count INTEGER DEFAULT 0,
  published_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_posts_slug ON posts(slug);
CREATE INDEX idx_posts_published_at ON posts(published_at DESC);
CREATE INDEX idx_posts_is_published ON posts(is_published);
CREATE INDEX idx_posts_view_count ON posts(view_count DESC);
```

## References

- REQUIREMENTS.md - Section 6.2 (Database Design)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Triggers](https://www.postgresql.org/docs/current/sql-createtrigger.html)

## Validation Queries

```sql
-- Check table structure
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';

-- Verify category hierarchy
SELECT c1.name AS level1, c2.name AS level2, c3.name AS level3
FROM categories c1
LEFT JOIN categories c2 ON c2.parent_id = c1.id
LEFT JOIN categories c3 ON c3.parent_id = c2.id
WHERE c1.parent_id IS NULL
ORDER BY c1.order_num, c2.order_num, c3.order_num;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public';
```
