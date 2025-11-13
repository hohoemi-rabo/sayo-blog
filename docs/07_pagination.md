# 07: Pagination Implementation

## Overview

Implement pagination component with page navigation, URL-based state, and responsive design. Display 12 posts per page with clear navigation controls.

## Related Files

- `src/components/Pagination.tsx` - Main pagination component
- `src/lib/pagination-utils.ts` - Pagination helper functions
- `src/app/page.tsx` - Integration with post listing
- `src/app/[prefecture]/page.tsx` - Prefecture-specific pagination

## Technical Details

### Pagination Strategy

- **Posts per page**: 12
- **URL structure**: `?page=1`, `?page=2`, etc.
- **Always show**: First page, last page, current page
- **Show ellipsis** when gap between pages > 1
- **Responsive**: Stack on mobile, horizontal on desktop

### URL Structure

```
/?page=2                           → 2ページ目
/nagano/?page=3                    → 長野県の3ページ目
/nagano/?category=iida&page=2      → 飯田市の2ページ目（フィルター維持）
/?hashtags=りんご&page=4           → ハッシュタグ検索の4ページ目
```

## Todo

### Pagination Component

- [ ] Create Pagination component (`src/components/Pagination.tsx`)
- [ ] Use `'use client'` directive (needs client navigation)
- [ ] Accept props: `currentPage`, `totalPages`, `baseUrl`
- [ ] Implement page button generation logic
- [ ] Add Previous/Next buttons
- [ ] Add First/Last page buttons
- [ ] Handle ellipsis (...) for large page ranges
- [ ] Apply active state styling to current page
- [ ] Disable buttons when at edges (first/last page)
- [ ] Preserve existing query parameters when navigating

### Pagination Logic

- [ ] Create `src/lib/pagination-utils.ts`
- [ ] Implement `getPaginationRange(currentPage, totalPages, siblingCount)`
  - [ ] Return array of page numbers with ellipsis
  - [ ] Example: [1, '...', 5, 6, 7, '...', 20]
- [ ] Implement `getPaginationInfo(totalItems, currentPage, itemsPerPage)`
  - [ ] Calculate: totalPages, offset, limit, hasNextPage, hasPreviousPage
- [ ] Implement `buildPaginationUrl(baseUrl, page, searchParams)`
  - [ ] Preserve all existing query params
  - [ ] Update only the page param

### Data Fetching Integration

- [ ] Update `src/app/page.tsx` to handle pagination
- [ ] Parse `page` from searchParams
- [ ] Calculate offset: `(page - 1) * 12`
- [ ] Use Supabase `.range(offset, offset + 11)` for pagination
- [ ] Get total count with `.count()` option
- [ ] Pass pagination data to Pagination component
- [ ] Handle invalid page numbers (redirect to page 1)
- [ ] Handle pages beyond total (redirect to last page)

### Styling & UX

- [ ] Apply design system colors to buttons
- [ ] Add hover effects to page buttons
- [ ] Show current page with distinct styling
- [ ] Add loading state during page transitions
- [ ] Implement smooth scroll to top on page change
- [ ] Add keyboard navigation support (arrow keys)
- [ ] Show page info: "Page 2 of 10" or "Showing 13-24 of 120 posts"

### Accessibility

- [ ] Add `aria-label` to pagination nav
- [ ] Add `aria-current="page"` to current page button
- [ ] Add `aria-disabled` to disabled buttons
- [ ] Ensure keyboard navigation works
- [ ] Add screen reader text for ellipsis

## Component Example

```typescript
// src/components/Pagination.tsx
'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getPaginationRange } from '@/lib/pagination-utils'

interface PaginationProps {
  currentPage: number
  totalPages: number
}

export default function Pagination({ currentPage, totalPages }: PaginationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', page.toString())

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' })

    // Navigate
    router.push(`${pathname}?${params.toString()}`)
  }

  const pages = getPaginationRange(currentPage, totalPages, 1)

  return (
    <nav
      className="flex items-center justify-center gap-2 mt-12"
      aria-label="Pagination"
    >
      {/* Previous Button */}
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg border hover:bg-background-dark/5 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Previous page"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Page Numbers */}
      {pages.map((page, index) => {
        if (page === '...') {
          return (
            <span key={`ellipsis-${index}`} className="px-2 text-text-secondary">
              ...
            </span>
          )
        }

        const pageNum = page as number
        const isActive = pageNum === currentPage

        return (
          <button
            key={pageNum}
            onClick={() => handlePageChange(pageNum)}
            className={`
              px-4 py-2 rounded-lg border font-medium transition-colors
              ${isActive
                ? 'bg-primary text-white border-primary'
                : 'hover:bg-background-dark/5'
              }
            `}
            aria-current={isActive ? 'page' : undefined}
          >
            {pageNum}
          </button>
        )
      })}

      {/* Next Button */}
      <button
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg border hover:bg-background-dark/5 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Next page"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </nav>
  )
}
```

## Pagination Utils Example

```typescript
// src/lib/pagination-utils.ts

/**
 * Generate pagination range with ellipsis
 * @param currentPage - Current active page (1-indexed)
 * @param totalPages - Total number of pages
 * @param siblingCount - Number of siblings to show on each side
 * @returns Array of page numbers and ellipsis strings
 */
export function getPaginationRange(
  currentPage: number,
  totalPages: number,
  siblingCount: number = 1
): (number | string)[] {
  const totalPageNumbers = siblingCount + 5 // siblings + first + last + current + 2 ellipsis

  // Case 1: Total pages less than the page numbers we want to show
  if (totalPageNumbers >= totalPages) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1)
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages)

  const shouldShowLeftEllipsis = leftSiblingIndex > 2
  const shouldShowRightEllipsis = rightSiblingIndex < totalPages - 1

  // Case 2: No left ellipsis, show right ellipsis
  if (!shouldShowLeftEllipsis && shouldShowRightEllipsis) {
    const leftRange = Array.from({ length: 3 + 2 * siblingCount }, (_, i) => i + 1)
    return [...leftRange, '...', totalPages]
  }

  // Case 3: Show left ellipsis, no right ellipsis
  if (shouldShowLeftEllipsis && !shouldShowRightEllipsis) {
    const rightRange = Array.from(
      { length: 3 + 2 * siblingCount },
      (_, i) => totalPages - (3 + 2 * siblingCount) + i + 1
    )
    return [1, '...', ...rightRange]
  }

  // Case 4: Show both ellipsis
  const middleRange = Array.from(
    { length: rightSiblingIndex - leftSiblingIndex + 1 },
    (_, i) => leftSiblingIndex + i
  )
  return [1, '...', ...middleRange, '...', totalPages]
}

/**
 * Calculate pagination metadata
 */
export function getPaginationInfo(
  totalItems: number,
  currentPage: number,
  itemsPerPage: number = 12
) {
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const offset = (currentPage - 1) * itemsPerPage
  const limit = itemsPerPage
  const hasNextPage = currentPage < totalPages
  const hasPreviousPage = currentPage > 1

  return {
    totalPages,
    offset,
    limit,
    hasNextPage,
    hasPreviousPage,
    startIndex: offset + 1,
    endIndex: Math.min(offset + itemsPerPage, totalItems),
  }
}
```

## Supabase Query Example

```typescript
// src/app/page.tsx
export default async function HomePage({ searchParams }) {
  const page = parseInt(searchParams?.page || '1')
  const limit = 12
  const offset = (page - 1) * limit

  // Fetch posts with count
  const { data: posts, count } = await supabase
    .from('posts')
    .select(
      `
      *,
      post_categories(categories(name, slug)),
      post_hashtags(hashtags(name, slug))
    `,
      { count: 'exact' }
    )
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1)

  const totalPages = Math.ceil((count || 0) / limit)

  // Redirect if page out of range
  if (page < 1 || (totalPages > 0 && page > totalPages)) {
    redirect('/?page=1')
  }

  return (
    <div>
      <PostGrid posts={posts} />
      <Pagination currentPage={page} totalPages={totalPages} />
    </div>
  )
}
```

## References

- REQUIREMENTS.md - Section 4.1 (Pagination)
- [Next.js useSearchParams](https://nextjs.org/docs/app/api-reference/functions/use-search-params)
- [Next.js useRouter](https://nextjs.org/docs/app/api-reference/functions/use-router)

## Validation

- [ ] Pagination displays correctly on all screen sizes
- [ ] Page numbers update URL correctly
- [ ] Browser back/forward buttons work
- [ ] Current page is visually distinct
- [ ] Disabled buttons cannot be clicked
- [ ] Ellipsis appears correctly for large page counts
- [ ] Filters are preserved when changing pages
- [ ] Keyboard navigation works (Tab + Enter)
- [ ] Screen readers announce page changes
- [ ] Page info displays correctly (e.g., "Page 2 of 10")
