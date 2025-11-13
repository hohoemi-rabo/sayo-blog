# 10: Popular Hashtags Cloud Implementation

## Overview

Implement a popular hashtags cloud component displaying the most used hashtags with variable sizes based on usage count. Include hover effects and filtering functionality.

## Related Files

- `src/components/PopularHashtags.tsx` - Main hashtags cloud component
- `src/lib/hashtag-utils.ts` - Hashtag size calculation utilities
- `src/app/page.tsx` - Integration on home page

## Technical Details

### Display Strategy

- **Position**: Below pagination on top page
- **Count**: Show top 20-30 hashtags
- **Sizing**: Variable font size based on usage count
- **Layout**: Wrapping cloud layout (flexbox wrap)
- **Sorting**: By popularity (count DESC)

### Size Calculation

```typescript
// Map count to font size
// Highest count → 2rem (32px)
// Lowest count → 0.875rem (14px)
```

### Styling

- **Colors**: Gradient from category colors on hover
- **Shape**: Rounded pills with border
- **Spacing**: Comfortable gaps between tags
- **Animation**: Scale on hover, fade-in on load

## Todo

### PopularHashtags Component

- [ ] Create PopularHashtags component (`src/components/PopularHashtags.tsx`)
- [ ] Use Server Component (no client interactivity needed initially)
- [ ] Fetch top 20-30 hashtags from Supabase
- [ ] Sort by count DESC
- [ ] Calculate font size based on count
- [ ] Display as flexbox with wrap
- [ ] Add title: "人気のハッシュタグ"
- [ ] Make each hashtag clickable (link to filtered view)
- [ ] Add hover effects (scale, color change)
- [ ] Add fade-in animation on load

### Hashtag Utils

- [ ] Create `src/lib/hashtag-utils.ts`
- [ ] Function: `calculateFontSize(count, minCount, maxCount)`
  - [ ] Map count to font size range (0.875rem - 2rem)
  - [ ] Use linear or logarithmic scaling
- [ ] Function: `getRandomGradient()`
  - [ ] Return random category gradient for variety
  - [ ] Cycle through category colors
- [ ] Function: `formatHashtagCount(count)`
  - [ ] Format with commas (e.g., 1,234)
  - [ ] Add "+" for large numbers (e.g., 10k+)

### Data Fetching

- [ ] Fetch from Supabase `hashtags` table
- [ ] Order by `count DESC`
- [ ] Limit to top 30
- [ ] Filter only hashtags with count > 0
- [ ] Include hashtag name and slug
- [ ] Cache results (optional: using React Cache)

### Styling & Animation

- [ ] Apply design system colors
- [ ] Use variable font sizes (0.875rem - 2rem)
- [ ] Add rounded pill shape (rounded-full)
- [ ] Add border with hover effect
- [ ] Implement scale on hover (scale-110)
- [ ] Add smooth transitions (transition-all duration-200)
- [ ] Fade-in animation on mount (Framer Motion)
- [ ] Add subtle shadow on hover

### Integration

- [ ] Add PopularHashtags to home page (`src/app/page.tsx`)
- [ ] Position below pagination
- [ ] Add section padding and background
- [ ] Make responsive (stack more on mobile)
- [ ] Add decorative border/pattern (optional)

### Accessibility

- [ ] Add proper ARIA labels to links
- [ ] Ensure keyboard navigation works
- [ ] Add focus styles
- [ ] Provide screen reader text for counts

## Component Example

```typescript
// src/components/PopularHashtags.tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { calculateFontSize } from '@/lib/hashtag-utils'

export default async function PopularHashtags() {
  const supabase = createClient()

  // Fetch top 30 popular hashtags
  const { data: hashtags } = await supabase
    .from('hashtags')
    .select('name, slug, count')
    .gt('count', 0)
    .order('count', { ascending: false })
    .limit(30)

  if (!hashtags || hashtags.length === 0) {
    return null
  }

  // Calculate min and max counts for sizing
  const counts = hashtags.map((h) => h.count)
  const minCount = Math.min(...counts)
  const maxCount = Math.max(...counts)

  return (
    <section className="bg-background-dark/5 py-12 px-4 rounded-xl">
      <div className="container mx-auto">
        <h2 className="text-2xl font-playfair font-bold text-center mb-8">
          人気のハッシュタグ
        </h2>

        <div className="flex flex-wrap gap-3 justify-center items-center">
          {hashtags.map((hashtag) => {
            const fontSize = calculateFontSize(
              hashtag.count,
              minCount,
              maxCount
            )

            return (
              <Link
                key={hashtag.slug}
                href={`/?hashtags=${hashtag.slug}`}
                className="
                  inline-block px-4 py-2 rounded-full border border-border-decorative
                  hover:border-primary hover:bg-primary/10 hover:scale-110
                  transition-all duration-200
                "
                style={{ fontSize: `${fontSize}rem` }}
                aria-label={`${hashtag.name} (${hashtag.count} posts)`}
              >
                #{hashtag.name}
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
```

## Hashtag Utils Example

```typescript
// src/lib/hashtag-utils.ts

/**
 * Calculate font size based on hashtag usage count
 * @param count - Hashtag usage count
 * @param minCount - Minimum count in dataset
 * @param maxCount - Maximum count in dataset
 * @returns Font size in rem (0.875 - 2.0)
 */
export function calculateFontSize(
  count: number,
  minCount: number,
  maxCount: number
): number {
  const minSize = 0.875 // 14px
  const maxSize = 2.0   // 32px

  if (maxCount === minCount) {
    return (minSize + maxSize) / 2
  }

  // Linear interpolation
  const normalized = (count - minCount) / (maxCount - minCount)
  const fontSize = minSize + normalized * (maxSize - minSize)

  return Math.round(fontSize * 1000) / 1000 // Round to 3 decimals
}

/**
 * Get a random category gradient for variety
 */
export function getRandomGradient(): string {
  const gradients = [
    'from-category-people-start to-category-people-end',
    'from-category-food-start to-category-food-end',
    'from-category-landscape-start to-category-landscape-end',
    'from-category-travel-start to-category-travel-end',
    'from-category-tradition-start to-category-tradition-end',
    'from-category-nature-start to-category-nature-end',
    'from-category-words-start to-category-words-end',
  ]

  return gradients[Math.floor(Math.random() * gradients.length)]
}

/**
 * Format hashtag count with commas
 */
export function formatHashtagCount(count: number): string {
  if (count >= 10000) {
    return `${Math.floor(count / 1000)}k+`
  }
  return count.toLocaleString('ja-JP')
}
```

## Advanced Variant (with tooltip)

```typescript
// Optional: Show count on hover with tooltip
'use client'

import { useState } from 'react'

export default function HashtagWithTooltip({ hashtag, fontSize }) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div className="relative">
      <Link
        href={`/?hashtags=${hashtag.slug}`}
        className="..."
        style={{ fontSize: `${fontSize}rem` }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        #{hashtag.name}
      </Link>

      {showTooltip && (
        <div className="
          absolute bottom-full left-1/2 -translate-x-1/2 mb-2
          px-3 py-1 bg-background-dark text-white text-sm rounded-lg
          whitespace-nowrap pointer-events-none
        ">
          {hashtag.count} posts
        </div>
      )}
    </div>
  )
}
```

## Alternative Layout (Masonry-style)

```typescript
// Alternative: Use columns for masonry-style layout
<div className="columns-2 md:columns-3 lg:columns-4 gap-3">
  {hashtags.map((hashtag) => (
    <Link
      key={hashtag.slug}
      href={`/?hashtags=${hashtag.slug}`}
      className="inline-block w-full mb-3 px-4 py-2 rounded-full ..."
    >
      #{hashtag.name}
    </Link>
  ))}
</div>
```

## References

- REQUIREMENTS.md - Section 4.1 (Popular Hashtags Cloud)
- [Flexbox Wrapping](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Flexible_Box_Layout/Mastering_Wrapping_of_Flex_Items)

## Validation

- [ ] Hashtags display with variable sizes
- [ ] Most popular hashtags are largest
- [ ] Hover effects work smoothly
- [ ] Click navigates to filtered view
- [ ] Responsive on all screen sizes
- [ ] Hashtags wrap correctly
- [ ] Loading is fast (no performance issues)
- [ ] Keyboard navigation works
- [ ] Focus states are visible
- [ ] Tooltip displays count on hover (if implemented)
- [ ] Colors are consistent with design system
- [ ] Animation runs smoothly on mount
