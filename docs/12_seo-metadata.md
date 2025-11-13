# 12: SEO & Metadata Implementation

## Overview

Implement comprehensive SEO optimization including dynamic metadata, Open Graph tags, structured data (JSON-LD), sitemaps, and robots.txt. Ensure optimal search engine discoverability.

## Related Files

- `src/app/layout.tsx` - Global metadata
- `src/app/[prefecture]/[slug]/page.tsx` - Article metadata
- `src/app/sitemap.ts` - Dynamic sitemap generation
- `src/app/robots.ts` - Robots.txt configuration
- `src/lib/seo-utils.ts` - SEO helper functions
- `public/favicon.ico` - Favicon
- `public/og-image.png` - Default OG image

## Technical Details

### Metadata Strategy

- **Global**: Site-wide defaults in root layout
- **Dynamic**: Page-specific metadata using `generateMetadata`
- **OG Images**: Dynamic OG image generation (optional)
- **Structured Data**: JSON-LD for Article, BreadcrumbList, Organization

### Key SEO Elements

- Title tags (60 characters max)
- Meta descriptions (150-160 characters)
- Open Graph tags (OG:title, OG:image, OG:description)
- Twitter Card tags
- Canonical URLs
- Structured data (JSON-LD)
- Sitemap.xml
- Robots.txt

## Todo

### Global Metadata

- [ ] Update `src/app/layout.tsx` with global metadata
- [ ] Set site title: "Sayo's Journal | 言葉で場所・人・記憶をつなぐ"
- [ ] Set meta description (150 chars)
- [ ] Add default OG image
- [ ] Configure Open Graph defaults
- [ ] Add Twitter Card defaults
- [ ] Set viewport configuration
- [ ] Add theme color meta tag
- [ ] Configure icon/favicon

### Article Page Metadata

- [ ] Implement `generateMetadata` in article page
- [ ] Dynamic title: `${post.title} | Sayo's Journal`
- [ ] Dynamic description from excerpt (150-160 chars)
- [ ] Dynamic OG image from thumbnail_url
- [ ] Add article:published_time and article:modified_time
- [ ] Add article:author meta tag
- [ ] Set canonical URL
- [ ] Add keywords meta tag (from hashtags)

### Structured Data (JSON-LD)

- [ ] Create `src/lib/structured-data.ts`
- [ ] Generate Article schema for blog posts
  - [ ] @type: "Article"
  - [ ] headline, image, datePublished, dateModified
  - [ ] author, publisher
- [ ] Generate BreadcrumbList schema
- [ ] Generate Organization schema (for site-wide)
- [ ] Add WebSite schema with search action
- [ ] Inject JSON-LD into page head

### Sitemap Generation

- [ ] Create `src/app/sitemap.ts`
- [ ] Fetch all published posts from Supabase
- [ ] Generate sitemap URLs for:
  - [ ] Home page (/)
  - [ ] All article pages (/[prefecture]/[slug]/)
  - [ ] Category pages (/[prefecture]/)
  - [ ] Static pages (/about, etc.)
- [ ] Set priorities (0.0 - 1.0):
  - [ ] Home: 1.0
  - [ ] Articles: 0.8
  - [ ] Categories: 0.6
- [ ] Set changefreq (always, daily, weekly, monthly)
- [ ] Add lastmod dates
- [ ] Limit to 50,000 URLs (if needed)

### Robots.txt

- [ ] Create `src/app/robots.ts`
- [ ] Allow all crawlers
- [ ] Disallow admin routes (if any)
- [ ] Add sitemap URL
- [ ] Set crawl-delay (if needed)

### SEO Utils

- [ ] Create `src/lib/seo-utils.ts`
- [ ] Function: `truncateDescription(text, maxLength)`
  - [ ] Truncate to maxLength with ellipsis
  - [ ] Avoid cutting words in half
- [ ] Function: `generateCanonicalUrl(path)`
  - [ ] Build full URL from path
  - [ ] Remove trailing slash
- [ ] Function: `extractKeywords(hashtags)`
  - [ ] Convert hashtags to comma-separated keywords
- [ ] Function: `generateStructuredData(post)`
  - [ ] Build JSON-LD for article

### OG Image Generation (Optional)

- [ ] Set up Vercel OG Image generation
- [ ] Create `src/app/api/og/route.tsx`
- [ ] Generate dynamic images with:
  - [ ] Article title
  - [ ] Category gradient background
  - [ ] Site logo
- [ ] Use @vercel/og package
- [ ] Cache generated images

### Performance Optimization

- [ ] Add `next-seo` package (optional)
- [ ] Implement image optimization
- [ ] Add loading="lazy" to images
- [ ] Optimize font loading (font-display: swap)
- [ ] Minimize CSS/JS bundle size
- [ ] Enable compression

### Analytics Setup (Optional)

- [ ] Add Google Analytics 4
- [ ] Add Google Search Console verification
- [ ] Track pageviews and events
- [ ] Monitor Core Web Vitals

## Implementation Examples

### Global Metadata

```typescript
// src/app/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: "Sayo's Journal | 言葉で場所・人・記憶をつなぐ",
    template: '%s | Sayo\'s Journal',
  },
  description:
    'ライター・インタビュアー本岡紗代のブログメディア。文章と写真で綴る、人と場所の物語。',
  keywords: ['ブログ', 'ライター', 'インタビュー', '旅', '地域', '長野'],
  authors: [{ name: '本岡紗代', url: 'https://www.sayo-kotoba.com' }],
  creator: '本岡紗代',
  publisher: 'Sayo\'s Journal',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://www.sayo-kotoba.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: 'https://www.sayo-kotoba.com',
    title: "Sayo's Journal",
    description: 'ライター・インタビュアー本岡紗代のブログメディア',
    siteName: "Sayo's Journal",
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: "Sayo's Journal",
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Sayo's Journal",
    description: 'ライター・インタビュアー本岡紗代のブログメディア',
    images: ['/og-image.png'],
    creator: '@sayo_kotoba', // Replace with actual Twitter handle
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
}
```

### Article Metadata

```typescript
// src/app/[prefecture]/[slug]/page.tsx
export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const supabase = createClient()

  const { data: post } = await supabase
    .from('posts')
    .select(
      `
      title,
      excerpt,
      thumbnail_url,
      published_at,
      updated_at,
      post_hashtags(hashtags(name))
    `
    )
    .eq('slug', params.slug)
    .single()

  if (!post) {
    return {
      title: 'Article Not Found',
    }
  }

  const keywords = post.post_hashtags.map((ph) => ph.hashtags.name).join(', ')

  return {
    title: post.title,
    description: post.excerpt,
    keywords,
    authors: [{ name: '本岡紗代' }],
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.published_at,
      modifiedTime: post.updated_at,
      authors: ['本岡紗代'],
      images: [
        {
          url: post.thumbnail_url,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [post.thumbnail_url],
    },
    alternates: {
      canonical: `/${params.prefecture}/${params.slug}/`,
    },
  }
}
```

### Structured Data

```typescript
// src/lib/structured-data.ts
import type { Post } from '@/lib/types'

export function generateArticleSchema(post: Post) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: post.thumbnail_url,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: {
      '@type': 'Person',
      name: '本岡紗代',
      url: 'https://www.sayo-kotoba.com',
    },
    publisher: {
      '@type': 'Organization',
      name: "Sayo's Journal",
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.sayo-kotoba.com/logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://www.sayo-kotoba.com/${post.slug}/`,
    },
  }
}

export function generateBreadcrumbSchema(
  categories: Array<{ name: string; slug: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: categories.map((category, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: category.name,
      item: `https://www.sayo-kotoba.com/${category.slug}/`,
    })),
  }
}
```

### Sitemap Generation

```typescript
// src/app/sitemap.ts
import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient()

  // Fetch all published posts
  const { data: posts } = await supabase
    .from('posts')
    .select(
      `
      slug,
      updated_at,
      post_categories(categories!inner(slug, parent_id))
    `
    )
    .eq('is_published', true)

  // Generate post URLs
  const postUrls =
    posts?.map((post) => {
      const prefecture = post.post_categories.find(
        (pc) => pc.categories.parent_id === null
      )?.categories.slug

      return {
        url: `https://www.sayo-kotoba.com/${prefecture}/${post.slug}/`,
        lastModified: new Date(post.updated_at),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }
    }) || []

  // Fetch all categories
  const { data: categories } = await supabase
    .from('categories')
    .select('slug')
    .is('parent_id', null)

  const categoryUrls =
    categories?.map((category) => ({
      url: `https://www.sayo-kotoba.com/${category.slug}/`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.6,
    })) || []

  return [
    {
      url: 'https://www.sayo-kotoba.com/',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    ...categoryUrls,
    ...postUrls,
  ]
}
```

### Robots.txt

```typescript
// src/app/robots.ts
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/'],
    },
    sitemap: 'https://www.sayo-kotoba.com/sitemap.xml',
  }
}
```

## References

- REQUIREMENTS.md - Section 6.1 (SEO)
- [Next.js Metadata API](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
- [Next.js Sitemap](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap)
- [Schema.org Article](https://schema.org/Article)

## Validation Checklist

- [ ] All pages have unique titles
- [ ] Meta descriptions are 150-160 characters
- [ ] OG images display correctly on social media
- [ ] Structured data validates on [Schema Validator](https://validator.schema.org/)
- [ ] Sitemap.xml is accessible at `/sitemap.xml`
- [ ] Robots.txt is accessible at `/robots.txt`
- [ ] Canonical URLs are correct
- [ ] Google Search Console shows no errors
- [ ] Lighthouse SEO score is 100
- [ ] Rich results appear in Google Search (if applicable)
