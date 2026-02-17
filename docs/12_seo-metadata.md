# 12: SEO & Metadata Implementation

## Overview

Implement comprehensive SEO optimization including dynamic metadata, Open Graph tags, structured data (JSON-LD), sitemaps, and robots.txt. Ensure optimal search engine discoverability.

## Related Files

- `src/app/layout.tsx` - Global metadata
- `src/app/(public)/[category]/[slug]/page.tsx` - Article metadata
- `src/app/(public)/search/page.tsx` - Search page metadata
- `src/app/sitemap.ts` - Dynamic sitemap generation
- `src/app/robots.ts` - Robots.txt configuration
- `src/lib/site-config.ts` - Site-wide constants
- `src/lib/seo-utils.ts` - SEO helper functions
- `src/lib/structured-data.tsx` - JSON-LD structured data generators
- `src/components/GoogleAnalytics.tsx` - GA4 component
- `public/favicon.ico` - Favicon (TODO: add asset)
- `public/og-image.png` - Default OG image (TODO: add asset)

## Technical Details

### Metadata Strategy

- **Global**: Site-wide defaults in root layout
- **Dynamic**: Page-specific metadata using `generateMetadata`
- **OG Images**: Dynamic OG image generation (optional - Phase 2)
- **Structured Data**: JSON-LD for Article, BreadcrumbList, Organization, WebSite

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

- [×] Update `src/app/layout.tsx` with global metadata
- [×] Set site title: "Sayo's Journal | 言葉で場所・人・記憶をつなぐ"
- [×] Set meta description (150 chars)
- [×] Add default OG image
- [×] Configure Open Graph defaults
- [×] Add Twitter Card defaults
- [×] Set viewport configuration
- [×] Add theme color meta tag
- [×] Configure icon/favicon
- [×] Add metadataBase for relative URL resolution
- [×] Add formatDetection settings
- [×] Add googleBot detailed robots settings
- [×] Create `src/lib/site-config.ts` for centralized constants

### Article Page Metadata

- [×] Implement `generateMetadata` in article page
- [×] Dynamic title: `${post.title} | Sayo's Journal`
- [×] Dynamic description from excerpt (150-160 chars)
- [×] Dynamic OG image from thumbnail_url
- [×] Add article:published_time and article:modified_time
- [×] Add article:author meta tag
- [×] Set canonical URL
- [×] Add keywords meta tag (from hashtags)

### Search Page Metadata

- [×] Add `generateMetadata` to search page
- [×] Dynamic title based on query
- [×] Set robots: noindex (search results not indexed)

### Structured Data (JSON-LD)

- [×] Create `src/lib/structured-data.tsx`
- [×] Generate Article schema for blog posts
  - [×] @type: "Article"
  - [×] headline, image, datePublished, dateModified
  - [×] author, publisher
- [×] Generate BreadcrumbList schema
- [×] Generate Organization schema (for site-wide)
- [×] Add WebSite schema with search action
- [×] Inject JSON-LD into page head (via JsonLd component)

### Sitemap Generation

- [×] Create `src/app/sitemap.ts`
- [×] Fetch all published posts from Supabase
- [×] Generate sitemap URLs for:
  - [×] Home page (/)
  - [×] All article pages (/[category]/[slug]/)
  - [×] Category pages (/?category=slug)
- [×] Set priorities (0.0 - 1.0):
  - [×] Home: 1.0
  - [×] Articles: 0.8
  - [×] Categories: 0.6
- [×] Set changefreq (daily, weekly)
- [×] Add lastmod dates

### Robots.txt

- [×] Create `src/app/robots.ts`
- [×] Allow all crawlers
- [×] Disallow admin routes and API routes
- [×] Add sitemap URL

### SEO Utils

- [×] Create `src/lib/seo-utils.ts`
- [×] Function: `truncateDescription(text, maxLength)`
  - [×] Truncate to maxLength with ellipsis
  - [×] Avoid cutting words in half
- [×] Function: `generateCanonicalUrl(path)`
  - [×] Build full URL from path
  - [×] Remove trailing slash
- [×] Function: `extractKeywords(hashtags)`
  - [×] Convert hashtags to keywords array

### OG Image Generation (Optional - Phase 2)

- [ ] Set up Vercel OG Image generation
- [ ] Create `src/app/api/og/route.tsx`
- [ ] Generate dynamic images with:
  - [ ] Article title
  - [ ] Category gradient background
  - [ ] Site logo
- [ ] Use @vercel/og package
- [ ] Cache generated images

### Performance Optimization

- [×] Optimize font loading (font-display: swap)
- [×] Image optimization via Next.js Image component (existing)
- [×] loading="lazy" on images (existing)

### Analytics Setup

- [×] Create GoogleAnalytics component
- [×] Environment variable based GA4 setup (NEXT_PUBLIC_GA_MEASUREMENT_ID)
- [ ] Add Google Search Console verification (after deployment)
- [ ] Track pageviews and events (after GA4 ID obtained)
- [ ] Monitor Core Web Vitals (after GA4 ID obtained)

### Image Assets (TODO)

- [ ] Create and add `public/favicon.ico`
- [ ] Create and add `public/favicon-16x16.png`
- [ ] Create and add `public/apple-touch-icon.png`
- [ ] Create and add `public/og-image.png` (1200x630)

## References

- REQUIREMENTS.md - Section 6.1 (SEO)
- [Next.js Metadata API](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
- [Next.js Sitemap](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap)
- [Schema.org Article](https://schema.org/Article)

## Validation Checklist

- [×] All pages have unique titles
- [×] Meta descriptions are 150-160 characters
- [ ] OG images display correctly on social media (after image assets added)
- [×] Structured data generated (validate on [Schema Validator](https://validator.schema.org/))
- [×] Sitemap.xml is accessible at `/sitemap.xml`
- [×] Robots.txt is accessible at `/robots.txt`
- [×] Canonical URLs are correct
- [ ] Google Search Console shows no errors (after deployment)
- [ ] Lighthouse SEO score is 100 (after deployment)
- [ ] Rich results appear in Google Search (after indexing)
