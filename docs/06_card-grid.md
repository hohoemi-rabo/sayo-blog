# 06: Card Grid & Post Cards Implementation

## Overview

Implement the article card grid with responsive layout, hover animations, and category-based styling.

## Related Files

- `src/components/PostGrid.tsx` - Grid container
- `src/components/PostCard.tsx` - Individual post card
- `src/components/CategoryBadge.tsx` - Category badge with gradient
- `src/components/HashtagList.tsx` - Hashtag display
- `src/lib/category-colors.ts` - Category color mappings
- `src/app/page.tsx` - Integration with filtering

## Technical Details

### Grid Layout

- Mobile (375px-767px): 1 column
- Tablet (768px-1023px): 2 columns
- Desktop (1024px+): 3 columns
- Gap: 1.5rem (24px)
- Stagger animation: 50ms delay between cards

### Card Structure

```
PostCard
  ├── Thumbnail (next/image)
  ├── CategoryBadge (prefecture with gradient)
  ├── Title
  ├── Excerpt (150-200 characters)
  ├── HashtagList (max 3 tags)
  └── Meta (PublishDate + ViewCount)
```

## Todo

### PostGrid Component

- [×] Create PostGrid component (`src/components/PostGrid.tsx`)
- [×] Implement responsive grid with Tailwind
  - [×] `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
  - [×] Gap: `gap-6`
- [×] Add Framer Motion stagger animation
  - [×] Parent: `variants` with `staggerChildren: 0.05`
  - [×] Children: fade-in from bottom
- [×] Handle empty state (no posts found)
- [×] Show loading skeleton (6 cards)

### PostCard Component

- [×] Create PostCard component (`src/components/PostCard.tsx`)
- [×] Use Server Component (no client interactivity needed)
- [×] Add Link wrapper for navigation
- [×] Implement card structure:
  - [×] Thumbnail with aspect-ratio-[4/3]
  - [×] Category badge (top-left overlay on image)
  - [×] Title (2 lines max, overflow ellipsis)
  - [×] Excerpt (3 lines max, overflow ellipsis)
  - [×] Hashtag list (3 tags max)
  - [×] Meta info (date + view count)
- [×] Add hover effects:
  - [×] Scale to 1.03
  - [×] Shadow intensity increase
  - [×] Category gradient shift
- [×] Add loading="lazy" to images
- [×] Implement proper image alt text

### CategoryBadge Component

- [×] Create CategoryBadge component (`src/components/CategoryBadge.tsx`)
- [×] Map category slug to gradient colors
- [×] Implement badge styles:
  - [×] Rounded pill shape
  - [×] Gradient background (category-specific)
  - [×] White text with drop shadow
  - [×] Small size (px-3 py-1)
- [×] Add hover gradient shift animation

### Category Color Mapping

- [×] Create `src/lib/category-colors.ts`
- [×] Define category gradient mappings:
  - [×] 人と暮らし: #E8A87C → #F5C794
  - [×] 食と時間: #FFB75E → #FFD194
  - [×] 風景とめぐり: #4FC3F7 → #81D4FA
  - [×] 旅と出会い: #5C6BC0 → #7986CB
  - [×] 伝統と手しごと: #8D6E63 → #A1887F
  - [×] 自然と暮らす: #66BB6A → #81C784
  - [×] 言葉ノート: #AB47BC → #BA68C8
- [×] Export helper function `getCategoryGradient(slug)`

### HashtagList Component

- [×] Create HashtagList component (`src/components/HashtagList.tsx`)
- [×] Display max 3 hashtags
- [×] Style as small pills with border
- [×] Show "+" indicator if more than 3 tags
- [×] Make hashtags clickable (link to filtered view)
- [×] Add hover effect

### Meta Information

- [×] Format date: "YYYY年MM月DD日" or "3 days ago"
- [×] Add eye icon for view count
- [×] Display in secondary text color
- [×] Add separator between date and views

### TypeScript Types

- [×] Create `src/lib/types.ts` with Post interface
```typescript
export interface Post {
  id: string
  title: string
  slug: string
  excerpt: string
  thumbnail_url: string
  view_count: number
  published_at: string
  categories: Category[]
  hashtags: Hashtag[]
}

export interface Category {
  slug: string
  name: string
  parent_id: string | null
}

export interface Hashtag {
  slug: string
  name: string
}
```

## Component Example

```typescript
// src/components/PostCard.tsx
import Image from 'next/image'
import Link from 'next/link'
import { CategoryBadge } from './CategoryBadge'
import { HashtagList } from './HashtagList'
import type { Post } from '@/lib/types'

export default function PostCard({ post }: { post: Post }) {
  const prefecture = post.categories.find(c => !c.parent_id)

  return (
    <Link
      href={`/${prefecture?.slug}/${post.slug}`}
      className="group block bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.03]"
    >
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={post.thumbnail_url}
          alt={post.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {prefecture && (
          <div className="absolute top-3 left-3">
            <CategoryBadge category={prefecture} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-playfair text-xl font-bold text-text-primary line-clamp-2 mb-2">
          {post.title}
        </h3>

        <p className="text-text-secondary text-sm line-clamp-3 mb-3">
          {post.excerpt}
        </p>

        <HashtagList hashtags={post.hashtags.slice(0, 3)} />

        <div className="flex items-center gap-4 mt-3 text-xs text-text-secondary">
          <span>{formatDate(post.published_at)}</span>
          <span className="flex items-center gap-1">
            <EyeIcon className="w-4 h-4" />
            {post.view_count.toLocaleString()}
          </span>
        </div>
      </div>
    </Link>
  )
}
```

## References

- REQUIREMENTS.md - Section 4.1 (PostCard Structure)
- CLAUDE.md - Composition Patterns
- [Next.js Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)
- [Framer Motion Stagger](https://www.framer.com/motion/animation/#orchestration)

## Validation

- [×] Cards display correctly on all screen sizes
- [×] Images load with proper aspect ratio
- [×] Hover animations run smoothly (60fps)
- [×] Category gradients display correctly
- [×] Hashtag links filter correctly
- [×] View counts format with commas (1,234)
- [×] Dates display in correct locale format
- [×] Card grid animates on initial load
- [×] Lazy loading works for images below fold
- [×] Accessibility: cards have proper ARIA labels
