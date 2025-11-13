# 05: Filter System Implementation

## Overview

Implement the filter bar with prefecture, category, hashtag, and sort options. Use URL search params for state management.

## Related Files

- `src/components/FilterBar.tsx` - Main filter component
- `src/components/PrefectureSelect.tsx` - Prefecture dropdown
- `src/components/HashtagInput.tsx` - Hashtag search input
- `src/components/SortSelect.tsx` - Sort dropdown
- `src/lib/filter-utils.ts` - Filter helper functions
- `src/app/page.tsx` - Implement filtering logic

## Technical Details

### URL Structure

```
/?prefecture=nagano                   → 長野県の記事
/?prefecture=nagano&category=iida     → 飯田市の記事
/?hashtags=飯田りんご,りんご狩り       → 複数ハッシュタグ
/?sort=popular                        → 人気順
/?prefecture=nagano&sort=latest&page=2 → 複合フィルター
```

### Filter State Management

Use Next.js `useSearchParams` and `useRouter` for client-side filtering, then fetch data server-side based on params.

## Todo

### FilterBar Component

- [×] Create FilterBar component (`src/components/FilterBar.tsx`)
- [×] Use `'use client'` directive (needs client-side interactivity)
- [×] Implement layout (horizontal on desktop, stack on mobile)
- [×] Add "Clear Filters" button
- [×] Show active filter count badge
- [×] Add smooth transitions when filters change

### Prefecture Select

- [×] Create PrefectureSelect component
- [×] Fetch prefecture categories from Supabase
- [×] Display as dropdown (use `<select>` or custom component)
- [×] Show "All Regions" option (clear filter)
- [×] Update URL on selection
- [ ] Show city options when prefecture selected (Phase 2)

### Hashtag Input

- [×] Create HashtagInput component
- [×] Implement autocomplete/suggestions
  - [×] Fetch popular hashtags from Supabase
  - [×] Show dropdown with suggestions
  - [×] Allow typing custom hashtag
- [×] Support multiple hashtag selection
- [×] Display selected hashtags as removable badges
- [×] Update URL with comma-separated hashtags

### Sort Select

- [×] Create SortSelect component
- [×] Options:
  - [×] Latest (default) - `published_at DESC`
  - [×] Popular - `view_count DESC`
  - [×] Title A-Z - `title ASC`
- [×] Update URL on selection
- [×] Show current sort with icon

### Filter Utils

- [×] Create helper functions in `src/lib/filter-utils.ts`
  - [×] `parseFiltersFromURL(searchParams)` - Extract filters from URL
  - [×] `buildFilterQuery(filters)` - Build Supabase query
  - [×] `serializeFiltersToURL(filters)` - Convert filters to URL string
- [×] Add TypeScript types for filter state

### Data Fetching Integration

- [×] Update `src/app/page.tsx` to accept searchParams
- [×] Parse filters from searchParams
- [×] Build Supabase query based on filters
- [×] Fetch filtered posts
- [×] Handle loading state with Suspense
- [×] Handle error state

### Styling & UX

- [×] Apply design system colors
- [×] Add hover effects to filter controls
- [×] Show loading spinner when filters change
- [×] Add subtle animation when results update
- [ ] Make filters sticky on scroll (Phase 2)
- [×] Add filter icons (SVG icons)

## Component Example

```typescript
// src/components/FilterBar.tsx
'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

export default function FilterBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const handlePrefectureChange = (prefecture: string) => {
    const params = new URLSearchParams(searchParams)
    if (prefecture) {
      params.set('prefecture', prefecture)
    } else {
      params.delete('prefecture')
    }
    params.delete('page') // Reset to page 1

    startTransition(() => {
      router.push(`/?${params.toString()}`)
    })
  }

  return (
    <div className="bg-background-dark/5 p-4 rounded-xl mb-8">
      <div className="flex flex-col md:flex-row gap-4">
        <PrefectureSelect
          value={searchParams.get('prefecture') || ''}
          onChange={handlePrefectureChange}
          disabled={isPending}
        />
        {/* Other filter components */}
      </div>
    </div>
  )
}
```

## Supabase Query Example

```typescript
// src/app/page.tsx
export default async function HomePage({ searchParams }) {
  const prefecture = searchParams?.prefecture
  const hashtags = searchParams?.hashtags?.split(',')
  const sort = searchParams?.sort || 'latest'

  let query = supabase
    .from('posts')
    .select(`
      *,
      post_categories!inner(
        categories!inner(slug, name, parent_id)
      ),
      post_hashtags(
        hashtags(name, slug)
      )
    `)
    .eq('is_published', true)

  // Apply prefecture filter
  if (prefecture) {
    query = query.eq('post_categories.categories.slug', prefecture)
  }

  // Apply hashtag filter
  if (hashtags?.length > 0) {
    query = query.in('post_hashtags.hashtags.slug', hashtags)
  }

  // Apply sort
  if (sort === 'popular') {
    query = query.order('view_count', { ascending: false })
  } else {
    query = query.order('published_at', { ascending: false })
  }

  const { data: posts } = await query

  return <PostGrid posts={posts} />
}
```

## References

- REQUIREMENTS.md - Section 4.1 (Filter Bar)
- [Next.js useSearchParams](https://nextjs.org/docs/app/api-reference/functions/use-search-params)
- [Supabase Filters](https://supabase.com/docs/reference/javascript/filter)

## Validation

- [×] URL updates correctly when filters change
- [×] Back button works (browser history)
- [×] Filters persist on page refresh
- [×] Multiple filters work together correctly
- [×] Clear filters button resets all filters
- [×] Loading state shows during filter changes
- [×] Accessible: keyboard navigation works
- [×] Mobile-friendly: filters stack vertically
