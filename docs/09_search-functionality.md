# 09: Search Functionality Implementation

## Overview

Implement full-text search functionality with autocomplete, filtering by category and hashtag, and responsive search UI. Use Supabase Full-Text Search for optimal performance.

## Related Files

- `src/components/SearchBar.tsx` - Main search input component
- `src/components/SearchResults.tsx` - Search results display
- `src/components/SearchSuggestions.tsx` - Autocomplete dropdown
- `src/app/search/page.tsx` - Search results page
- `src/lib/search-utils.ts` - Search helper functions
- `src/app/api/search/suggest/route.ts` - Suggestion API endpoint

## Technical Details

### Search Strategy

- **Full-text search**: Supabase PostgreSQL `to_tsvector` and `to_tsquery`
- **Search fields**: title, excerpt, content
- **Ranking**: Use `ts_rank` for relevance scoring
- **Filters**: Combine with category and hashtag filters
- **Debounce**: 300ms delay for autocomplete suggestions

### URL Structure

```
/search?q=りんご狩り               → 基本検索
/search?q=りんご&prefecture=nagano  → 地域フィルター付き
/search?q=温泉&hashtags=秋の信州   → ハッシュタグフィルター付き
/search?q=カフェ&page=2            → ページネーション
```

## Todo

### SearchBar Component

- [×] Create SearchBar component (`src/components/SearchBar.tsx`)
- [×] Use `'use client'` directive (needs interactivity)
- [×] Add search input with icon (Lucide Search)
- [×] Implement debounced input (300ms)
- [×] Show loading spinner during search
- [×] Add clear button (X icon)
- [×] Show search suggestions dropdown
- [×] Navigate to search results page on submit
- [ ] Add keyboard navigation (Arrow keys, Enter, Escape) - Escape only implemented
- [×] Make responsive (full-width on mobile)

### Search Results Page

- [×] Create `src/app/search/page.tsx`
- [×] Parse search query from URL params
- [×] Fetch search results from Supabase
- [×] Display results using PostCard component
- [×] Show result count: "「りんご狩り」の検索結果: 15件"
- [×] Handle no results case
- [×] Add pagination (12 results per page)
- [ ] Show active filters (category, hashtags) - Not needed for basic search
- [ ] Add "Clear filters" button - Not needed for basic search
- [ ] Highlight search terms in results (optional) - Skipped

### SearchSuggestions Component

- [×] Create SearchSuggestions component - Integrated into SearchBar
- [×] Fetch suggestions from API on input change
- [×] Display as dropdown below search bar
- [ ] Show recent searches (from localStorage) - Skipped for MVP
- [ ] Show popular searches - Skipped for MVP
- [×] Show matching posts (top 5)
- [×] Show matching hashtags
- [ ] Add keyboard navigation (Arrow keys) - Skipped for MVP
- [×] Close on click outside
- [×] Clear on Escape key

### Search API Endpoint

- [×] Create `src/app/api/search/suggest/route.ts`
- [×] Implement GET handler with query param
- [×] Search posts by title and excerpt (lightweight)
- [×] Search hashtags by name
- [×] Return top 5 posts + top 5 hashtags
- [ ] Add response caching (optional) - Skipped for MVP

### Supabase Full-Text Search Setup

- [×] Create text search configuration in Supabase
- [×] Add tsvector column to posts table (generated)
- [×] Create GIN index on tsvector column
- [×] Create search function with ranking
- [×] Test Japanese text search (ensure proper tokenization)

### Search Utils

- [×] Create `src/lib/search-utils.ts` - Implemented directly in page.tsx
- [×] Function: `buildSearchQuery(query, filters)` - Implemented as searchPosts()
  - [×] Build Supabase query with full-text search
  - [ ] Apply category and hashtag filters - Not needed for basic search
  - [×] Order by relevance (ts_rank)
- [ ] Function: `highlightSearchTerms(text, query)` - Skipped for MVP
  - [ ] Wrap matching terms in `<mark>` tags
  - [ ] Handle Japanese text properly
- [×] Function: `sanitizeSearchQuery(query)` - Implemented inline with trim()
  - [ ] Remove special characters - Not needed (handled by RPC)
  - [ ] Limit length (max 100 chars) - Not needed for MVP
  - [×] Trim whitespace

### Recent Searches

- [ ] Store recent searches in localStorage - Skipped for MVP
- [ ] Limit to last 5 searches - Skipped for MVP
- [ ] Display in suggestions dropdown - Skipped for MVP
- [ ] Add "Clear history" button - Skipped for MVP
- [ ] Handle privacy (clear on logout) - Skipped for MVP

### Search Analytics (Optional)

- [ ] Track search queries in Supabase - Skipped (Optional)
- [ ] Create `search_logs` table - Skipped (Optional)
- [ ] Store: query, result_count, timestamp - Skipped (Optional)
- [ ] Use for improving search and content strategy - Skipped (Optional)

## Component Example

```typescript
// src/components/SearchBar.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Loader2 } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import SearchSuggestions from './SearchSuggestions'

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const debouncedQuery = useDebounce(query, 300)

  // Fetch suggestions when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      setIsLoading(true)
      fetch(`/api/search/suggest?q=${encodeURIComponent(debouncedQuery)}`)
        .then((res) => res.json())
        .then((data) => {
          setSuggestions(data)
          setIsOpen(true)
        })
        .finally(() => setIsLoading(false))
    } else {
      setSuggestions([])
      setIsOpen(false)
    }
  }, [debouncedQuery])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`)
      setIsOpen(false)

      // Save to recent searches
      const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]')
      const updated = [query, ...recent.filter((q) => q !== query)].slice(0, 5)
      localStorage.setItem('recentSearches', JSON.stringify(updated))
    }
  }

  const handleClear = () => {
    setQuery('')
    setIsOpen(false)
    inputRef.current?.focus()
  }

  return (
    <div className="relative w-full max-w-2xl">
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="記事を検索..."
          className="w-full pl-12 pr-12 py-3 rounded-xl border border-border-decorative focus:outline-none focus:ring-2 focus:ring-primary"
        />

        {isLoading && (
          <Loader2 className="absolute right-12 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary animate-spin" />
        )}

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-background-dark/5 rounded-full"
            aria-label="Clear search"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        )}
      </form>

      {isOpen && (
        <SearchSuggestions
          suggestions={suggestions}
          query={query}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
```

## Supabase Full-Text Search Setup

```sql
-- Enable Japanese text search extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add tsvector column for full-text search
ALTER TABLE posts
ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('japanese', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('japanese', coalesce(excerpt, '')), 'B') ||
  setweight(to_tsvector('japanese', coalesce(content, '')), 'C')
) STORED;

-- Create GIN index for fast search
CREATE INDEX idx_posts_search_vector ON posts USING GIN (search_vector);

-- Create search function with ranking
CREATE OR REPLACE FUNCTION search_posts(search_query TEXT)
RETURNS TABLE (
  id UUID,
  title TEXT,
  slug TEXT,
  excerpt TEXT,
  thumbnail_url TEXT,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.title,
    p.slug,
    p.excerpt,
    p.thumbnail_url,
    ts_rank(p.search_vector, to_tsquery('japanese', search_query)) AS rank
  FROM posts p
  WHERE p.search_vector @@ to_tsquery('japanese', search_query)
    AND p.is_published = true
  ORDER BY rank DESC, p.published_at DESC;
END;
$$ LANGUAGE plpgsql;
```

## Search Results Page Example

```typescript
// src/app/search/page.tsx
import { createClient } from '@/lib/supabase'
import PostCard from '@/components/PostCard'
import Pagination from '@/components/Pagination'
import { Search } from 'lucide-react'

export default async function SearchPage({ searchParams }) {
  const query = searchParams?.q || ''
  const page = parseInt(searchParams?.page || '1')
  const limit = 12
  const offset = (page - 1) * limit

  const supabase = createClient()

  // Search posts with full-text search
  const { data: posts, count } = await supabase.rpc('search_posts', {
    search_query: query,
  })

  const totalPages = Math.ceil((count || 0) / limit)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-playfair font-bold mb-2">
          <Search className="inline-block w-8 h-8 mr-2" />
          検索結果
        </h1>
        <p className="text-text-secondary">
          「{query}」の検索結果: {count}件
        </p>
      </div>

      {posts.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>

          <Pagination currentPage={page} totalPages={totalPages} />
        </>
      ) : (
        <div className="text-center py-16">
          <p className="text-xl text-text-secondary mb-4">
            検索結果が見つかりませんでした
          </p>
          <p className="text-text-secondary">
            別のキーワードで検索してみてください
          </p>
        </div>
      )}
    </div>
  )
}
```

## References

- REQUIREMENTS.md - Section 4.1 (Search)
- [Supabase Full-Text Search](https://supabase.com/docs/guides/database/full-text-search)
- [PostgreSQL Text Search](https://www.postgresql.org/docs/current/textsearch.html)

## Validation

- [×] Search returns relevant results
- [×] Japanese text search works correctly
- [×] Autocomplete suggestions appear within 300ms
- [ ] Keyboard navigation works (Arrow keys, Enter, Escape) - Escape only
- [×] Search results display correctly
- [×] Pagination works on search results
- [ ] Filters combine correctly with search - Not implemented for basic search
- [×] No results message displays correctly
- [ ] Recent searches save and display - Skipped for MVP
- [×] Search bar is accessible (ARIA labels)
- [×] Mobile-friendly search UI
- [×] Search performance is acceptable (< 500ms)
