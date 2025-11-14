# 08: Article Page Implementation

## Overview

Implement individual article pages with hero section, markdown rendering, metadata display, and responsive typography. Use ISR for optimal performance.

## Related Files

- `src/app/[prefecture]/[slug]/page.tsx` - Article page route
- `src/components/ArticleHero.tsx` - Hero section with title and metadata
- `src/components/ArticleBody.tsx` - Main content with markdown
- `src/components/ArticleMeta.tsx` - Date, view count, categories
- `src/lib/markdown-utils.ts` - Markdown processing utilities
- `src/lib/view-counter.ts` - View count increment logic

## Technical Details

### URL Structure

```
https://www.sayo-kotoba.com/nagano/apple-harvest-iida-2024/
                          ↑        ↑
                          都道府県  記事スラッグ
```

### ISR Configuration

```typescript
export const revalidate = 3600 // 1 hour ISR
```

### Data Fetching Strategy

- Use `generateStaticParams` to pre-render top 20-30 articles
- Use ISR for remaining articles (on-demand generation)
- Increment view count on page load (client-side)

## Todo

### Dynamic Route Setup

- [×] Create `src/app/[prefecture]/[slug]/page.tsx`
- [×] Implement `generateStaticParams` for pre-rendering
  - [×] Fetch top 20-30 most viewed posts
  - [×] Return array of `{ prefecture, slug }` params
- [×] Implement `generateMetadata` for dynamic SEO
  - [×] Set title, description, OG image from post data
  - [ ] Add article schema JSON-LD (Phase 2)
- [×] Configure ISR revalidation: `export const revalidate = 3600`
- [×] Handle 404 for non-existent posts

### ArticleHero Component

- [×] Create ArticleHero component (`src/components/ArticleHero.tsx`)
- [×] Display hero image (thumbnail_url) with aspect-ratio-[16/9]
- [×] Show article title (large, font-playfair)
- [×] Display category badges (prefecture + city)
- [×] Show published date and updated date
- [×] Add view count with eye icon
- [×] Implement gradient overlay on image
- [×] Make responsive (full-width on mobile)

### ArticleBody Component

- [×] Create ArticleBody component (`src/components/ArticleBody.tsx`)
- [×] Render HTML content from `content` field
- [×] Apply typography styles:
  - [×] Headings: font-playfair with appropriate sizes
  - [×] Body: font-noto-serif-jp, line-height 1.8
  - [×] Links: underline, primary color
  - [×] Blockquotes: border-left, italic
  - [×] Code blocks: monospace, background color
- [×] Add `prose` class (Tailwind Typography)
- [×] Style images: rounded corners, shadow, max-width
- [×] Handle responsive images (use next/image where possible)

### ArticleMeta Component

- [×] Create ArticleMeta component (`src/components/ArticleMeta.tsx`)
- [×] Display published date (formatted: "YYYY年MM月DD日")
- [×] Show updated date if different from published
- [×] Display view count with icon
- [×] Show all categories (prefecture > city > district)
- [×] Display all hashtags as clickable badges
- [ ] Add social share buttons (Twitter, Facebook) [Optional - Phase 2]

### Markdown Processing

- [ ] Create `src/lib/markdown-utils.ts` (Phase 2 - currently using dangerouslySetInnerHTML)
- [ ] Function to sanitize HTML (prevent XSS)
- [ ] Function to process image URLs (ensure absolute URLs)
- [ ] Function to add target="_blank" to external links
- [ ] Function to extract headings for table of contents (Phase 2)

### View Counter

- [×] Create `src/lib/view-counter.ts`
- [×] Client-side function to increment view count
- [×] Use API route: `POST /api/posts/[slug]/view`
- [×] Throttle increments (once per session using localStorage)
- [×] Handle errors gracefully (don't block page load)

### API Route for View Count

- [×] Create `src/app/api/posts/[slug]/view/route.ts`
- [×] Implement POST handler
- [×] Increment `view_count` in Supabase
- [×] Use RPC function `increment_post_view_count`
- [×] Return updated count
- [ ] Add rate limiting (optional - Phase 2)

### Breadcrumbs

- [×] Create Breadcrumbs component (`src/components/Breadcrumbs.tsx`)
- [×] Show navigation path: Home > 長野県 > 飯田市 > 記事タイトル
- [×] Make each item clickable (link to category page)
- [×] Add schema.org BreadcrumbList structured data
- [×] Style with separators (›)

### SEO & Metadata

- [×] Implement `generateMetadata` function
- [×] Set dynamic title: `${post.title} | Sayo's Journal`
- [×] Set description from excerpt
- [×] Add OG image (thumbnail_url)
- [×] Add article:published_time and article:modified_time
- [ ] Add article:author meta tag (Phase 2)
- [ ] Generate JSON-LD for Article schema (Phase 2)
- [ ] Add canonical URL (Phase 2)

### Styling & Typography

- [×] Install @tailwindcss/typography: `npm install @tailwindcss/typography`
- [×] Add plugin to tailwind.config.ts
- [×] Apply `prose` class to article body
- [×] Customize prose styles for Japanese typography
- [×] Set appropriate line-height and letter-spacing
- [×] Add smooth reading experience (max-width: none for full-width)

## Component Example

```typescript
// src/app/[prefecture]/[slug]/page.tsx
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { createClient } from '@/lib/supabase'
import ArticleHero from '@/components/ArticleHero'
import ArticleBody from '@/components/ArticleBody'
import ArticleMeta from '@/components/ArticleMeta'
import Breadcrumbs from '@/components/Breadcrumbs'

export const revalidate = 3600 // 1 hour ISR

interface ArticlePageProps {
  params: {
    prefecture: string
    slug: string
  }
}

// Pre-render top 30 articles
export async function generateStaticParams() {
  const supabase = createClient()

  const { data: posts } = await supabase
    .from('posts')
    .select('slug, post_categories!inner(categories!inner(slug, parent_id))')
    .eq('is_published', true)
    .order('view_count', { ascending: false })
    .limit(30)

  return (
    posts?.map((post) => {
      const prefecture = post.post_categories.find(
        (pc) => pc.categories.parent_id === null
      )
      return {
        prefecture: prefecture?.categories.slug,
        slug: post.slug,
      }
    }) || []
  )
}

// Dynamic metadata
export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const supabase = createClient()

  const { data: post } = await supabase
    .from('posts')
    .select('title, excerpt, thumbnail_url, published_at')
    .eq('slug', params.slug)
    .single()

  if (!post) {
    return {
      title: 'Article Not Found',
    }
  }

  return {
    title: `${post.title} | Sayo's Journal`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [post.thumbnail_url],
      type: 'article',
      publishedTime: post.published_at,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [post.thumbnail_url],
    },
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const supabase = createClient()

  // Fetch post with all relations
  const { data: post } = await supabase
    .from('posts')
    .select(
      `
      *,
      post_categories(
        categories(id, name, slug, parent_id)
      ),
      post_hashtags(
        hashtags(name, slug)
      )
    `
    )
    .eq('slug', params.slug)
    .eq('is_published', true)
    .single()

  if (!post) {
    notFound()
  }

  // Extract categories in hierarchy
  const categories = post.post_categories
    .map((pc) => pc.categories)
    .sort((a, b) => {
      if (!a.parent_id) return -1
      if (!b.parent_id) return 1
      return 0
    })

  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumbs categories={categories} title={post.title} />

      <ArticleHero
        title={post.title}
        thumbnail={post.thumbnail_url}
        categories={categories}
        publishedAt={post.published_at}
        updatedAt={post.updated_at}
        viewCount={post.view_count}
      />

      <ArticleBody content={post.content} />

      <ArticleMeta
        categories={categories}
        hashtags={post.post_hashtags.map((ph) => ph.hashtags)}
        publishedAt={post.published_at}
        updatedAt={post.updated_at}
      />
    </article>
  )
}
```

## References

- REQUIREMENTS.md - Section 4.2 (Article Page)
- [Next.js generateStaticParams](https://nextjs.org/docs/app/api-reference/functions/generate-static-params)
- [Next.js ISR](https://nextjs.org/docs/app/building-your-application/data-fetching/revalidating)
- [@tailwindcss/typography](https://tailwindcss.com/docs/typography-plugin)

## Validation

- [×] Article pages render correctly with all content
- [×] Images load with proper aspect ratio
- [×] Typography is readable and well-spaced
- [×] Metadata (title, description, OG image) is correct
- [×] View count increments correctly
- [×] Breadcrumbs display correct hierarchy
- [×] Categories and hashtags are clickable
- [×] Links in article body work correctly
- [×] Responsive on all screen sizes (375px - 1920px)
- [×] ISR revalidation works (content updates after 1 hour)
- [×] 404 page shows for non-existent articles (notFound() implemented)
- [ ] Lighthouse score: Performance 90+, Accessibility 100 (to be tested)
