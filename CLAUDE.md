# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Sayo's Journal** - A narrative blog site combining "words × photos × experiences" for writer/interviewer Sayo Motooka. This project migrates 80+ existing articles to a modern Next.js + Supabase stack with a poetic psychedelic design aesthetic inspired by Peter Max, Victor Moscoso, Aubrey Beardsley, René Magritte, and Millais' Ophelia.

## Development Commands

```bash
# Development
npm run dev          # Start development server (http://localhost:3000)

# Build & Production
npm run build        # Production build
npm start           # Start production server

# Linting
npm run lint        # Run ESLint
```

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS 3.4.17
- **Database**: Supabase (PostgreSQL with hierarchical categories)
- **Storage**: Supabase Storage (for images)
- **Language**: TypeScript 5
- **React**: 19.1.0

## Architecture

### Project Structure

```
sayo-blog/
├── src/
│   └── app/              # Next.js App Router
│       ├── layout.tsx    # Root layout with font configuration
│       ├── page.tsx      # Home page
│       └── globals.css   # Global styles
├── REQUIREMENTS.md       # Comprehensive project requirements (Phase 1 & 2)
├── .mcp.json            # MCP configuration for Supabase (gitignored)
└── .mcp.json.example    # Template for MCP setup
```

### URL Structure & Routing

The site uses a hierarchical URL structure based on prefectures:

```
/                                    → All articles (top page)
/nagano/                            → Nagano prefecture articles
/nagano/?category=iida              → Iida city articles
/nagano/[article-slug]/             → Individual article
/hashtags/[hashtag-slug]/           → Articles by hashtag
/?hashtags=tag1,tag2                → Multiple hashtag filter
/?sort=popular                      → Sort by view count
```

**Key Design Decision**: Only the first level (prefecture) is in the URL path. Lower levels (city, district) are managed as categories in the database for SEO and implementation simplicity.

### Database Schema (Supabase)

#### Core Tables

1. **posts** - Main article table
   - Fields: id, title, slug, content (HTML), excerpt, thumbnail_url, view_count, published_at, is_published
   - Indexes: slug, published_at, is_published, view_count

2. **categories** - Hierarchical location categories (prefecture → city → district)
   - Self-referential with parent_id
   - Fields: name, slug, parent_id, order_num, description, image_url, meta_title, meta_description
   - Example: 長野県 (NULL) → 飯田市 (nagano) → 上郷 (iida)

3. **post_categories** - Many-to-many junction table
   - Links posts to multiple hierarchical categories

4. **hashtags** - Tag system for SNS-style content discovery
   - Fields: name, slug, count (cached usage count)
   - Auto-updated via triggers

5. **post_hashtags** - Many-to-many junction table

6. **reactions** (Phase 2) - Emotion-based reactions (💡🩷👍🔥)

#### Key Database Features

- **RLS (Row Level Security)**: Only published posts visible to public; authenticated users (admins) have full access
- **Triggers**: Auto-update hashtag counts and updated_at timestamps
- **Indexes**: Optimized for common queries (slug lookups, date sorting, view counts)

### Data Fetching Pattern

Use Supabase client with nested relationships:

```typescript
// Example: Fetch prefecture articles with categories and hashtags
const { data: posts } = await supabase
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
  .eq('post_categories.categories.slug', prefecture)
  .order('published_at', { ascending: false });
```

## Design System

### Color Palette

Inspired by psychedelic and decorative art movements:

- **Primary**: `#FF6B9D` (vivid rose)
- **Background**: `#FAF8F5` (soft off-white)
- **Text**: `#1A1816` (rich black)
- **Accents**: `#4ECDC4` (turquoise), `#9B59B6` (purple)

**Category Gradients** (each category has unique gradient):
- 人と暮らし: `#E8A87C → #F5C794`
- 食と時間: `#FFB75E → #FFD194`
- 風景とめぐり: `#4FC3F7 → #81D4FA`
- 旅と出会い: `#5C6BC0 → #7986CB`
- 伝統と手しごと: `#8D6E63 → #A1887F`
- 自然と暮らす: `#66BB6A → #81C784`
- 言葉ノート: `#AB47BC → #BA68C8`

### Typography

- **Headings**: Playfair Display, Cormorant Garamond (decorative serif)
- **Body (Japanese)**: Noto Serif JP (warm readability)
- **UI/Navigation**: Noto Sans JP
- **Current**: Geist Sans/Mono (will be replaced with above)

### Component Conventions

Use `@/` path alias for imports (configured in tsconfig.json):
```typescript
import { Component } from '@/components/Component';
```

## Development Phases

### Phase 1 (Current) - Core Features
- Top page with card grid
- Filter bar (prefecture, category, hashtag, sort)
- Basic article page
- Responsive design (375px-1920px)
- 12 articles per page with pagination

### Phase 2 - Interaction Enhancement
- Scroll progress bar
- Fixed table of contents with current section highlight
- Image lightbox
- Related articles
- Reaction system (💡🩷👍🔥)
- Scroll animations (Framer Motion)

## MCP (Model Context Protocol) Setup

This project uses Supabase MCP for database operations:

1. Copy `.mcp.json.example` to `.mcp.json`
2. Set `SUPABASE_ACCESS_TOKEN` environment variable in `~/.bashrc`:
   ```bash
   export SUPABASE_ACCESS_TOKEN="your-token-here"
   ```
3. Restart Claude Code

**Current Supabase Project**: `sayo-blog` (ID: `nkvohswifpmarobyrnbe`, Region: ap-northeast-1)

## Next.js 15 App Router Best Practices

### Server Components First (Default)

**Always use Server Components by default** - they reduce client-side JavaScript and enable direct database/API access:

```typescript
// ✅ GOOD: Server Component (default in app directory)
export default async function PostsPage() {
  const posts = await fetch('https://api.vercel.app/blog')
  const data = await posts.json()

  return (
    <ul>
      {data.map(post => <li key={post.id}>{post.title}</li>)}
    </ul>
  )
}
```

Only add `'use client'` when you need:
- React hooks (useState, useEffect, etc.)
- Event handlers (onClick, onChange, etc.)
- Browser APIs (localStorage, window, etc.)
- Third-party libraries that use client-only features

### Data Fetching Strategies

#### 1. Static Data (Default - ISR)
```typescript
// Cached until manually invalidated (force-cache is default)
async function getPosts() {
  const res = await fetch('https://api.vercel.app/blog', {
    cache: 'force-cache' // Optional - this is default
  })
  return res.json()
}
```

#### 2. Dynamic Data (Server-Side Rendering)
```typescript
// Refetch on every request
async function getRealtimeData() {
  const res = await fetch('https://api.vercel.app/live', {
    cache: 'no-store' // Opt out of caching
  })
  return res.json()
}
```

#### 3. Incremental Static Regeneration (ISR)
```typescript
// Revalidate every 60 seconds
async function getProducts() {
  const res = await fetch('https://api.vercel.app/products', {
    next: { revalidate: 60 }
  })
  return res.json()
}

// Or use route segment config
export const revalidate = 60
```

#### 4. On-Demand Revalidation
```typescript
'use server'
import { revalidatePath, revalidateTag } from 'next/cache'

// Revalidate specific path
export async function updatePost() {
  await db.posts.update(...)
  revalidatePath('/posts') // Clear cache for /posts
}

// Revalidate by tag
export async function updatePosts() {
  await db.posts.update(...)
  revalidateTag('posts') // Clear all fetches tagged with 'posts'
}
```

### Composition Patterns

#### Pass Server Data to Client Components
```typescript
// ✅ GOOD: Fetch in Server Component, pass to Client Component
export default async function Page() {
  const posts = await getPosts() // Server-side fetch

  return <ClientPostList posts={posts} /> // Pass as props
}
```

```typescript
// app/components/ClientPostList.tsx
'use client'

export default function ClientPostList({ posts }) {
  const [filter, setFilter] = useState('')
  // Client-side filtering with server data
  const filtered = posts.filter(p => p.title.includes(filter))

  return (
    <>
      <input value={filter} onChange={e => setFilter(e.target.value)} />
      <ul>{filtered.map(p => <li key={p.id}>{p.title}</li>)}</ul>
    </>
  )
}
```

#### Nest Client Components in Server Components
```typescript
// ✅ GOOD: Interleave Server and Client Components
import Header from './Header' // Server Component
import Counter from './Counter' // Client Component

export default function Page() {
  return (
    <div>
      <Header /> {/* Server Component */}
      <Counter /> {/* Client Component */}
    </div>
  )
}
```

### Parallel Data Fetching

**Avoid waterfalls** - fetch data in parallel:

```typescript
// ❌ BAD: Sequential (waterfall)
export default async function Page() {
  const artist = await getArtist()
  const albums = await getAlbums(artist.id) // Waits for artist
  return <div>...</div>
}

// ✅ GOOD: Parallel
export default async function Page() {
  const artistPromise = getArtist()
  const albumsPromise = getAlbums()

  const [artist, albums] = await Promise.all([artistPromise, albumsPromise])
  return <div>...</div>
}
```

### Preloading Pattern

For dependent data, use the preload pattern:

```typescript
// lib/data.ts
import { cache } from 'react'
import 'server-only'

export const preload = (id: string) => {
  void getItem(id) // Start fetching without awaiting
}

export const getItem = cache(async (id: string) => {
  const data = await fetch(`/api/items/${id}`)
  return data.json()
})
```

```typescript
// app/page.tsx
import { preload, getItem } from '@/lib/data'

export default async function Page({ params }) {
  const { id } = await params
  preload(id) // Start fetching early

  const isAvailable = await checkAvailability() // Do other work

  return isAvailable ? <Item id={id} /> : null
}

async function Item({ id }) {
  const item = await getItem(id) // Data is likely ready
  return <div>{item.name}</div>
}
```

### Streaming with Suspense

Use Suspense boundaries to stream UI progressively:

```typescript
import { Suspense } from 'react'

export default function Page() {
  return (
    <>
      <Header /> {/* Rendered immediately */}

      <Suspense fallback={<PostsSkeleton />}>
        <Posts /> {/* Streams when ready */}
      </Suspense>

      <Suspense fallback={<CommentsSkeleton />}>
        <Comments /> {/* Streams independently */}
      </Suspense>
    </>
  )
}

async function Posts() {
  const posts = await getPosts() // Can be slow
  return <ul>...</ul>
}
```

### Route Handlers Best Practices

Use Route Handlers for API endpoints accessed by Client Components:

```typescript
// app/api/posts/route.ts
export async function GET() {
  const posts = await db.posts.findMany()
  return Response.json({ posts })
}

// ❌ DON'T call Route Handlers from Server Components
// ✅ DO call Route Handlers from Client Components
```

### Static Params Generation

For dynamic routes, use `generateStaticParams`:

```typescript
// app/posts/[slug]/page.tsx
export async function generateStaticParams() {
  const posts = await fetch('https://api.vercel.app/blog').then(r => r.json())

  return posts.map(post => ({
    slug: post.slug
  }))
}

export const dynamicParams = true // Allow on-demand rendering for unknown slugs

export default async function Page({ params }) {
  const { slug } = await params
  const post = await getPost(slug)
  return <article>{post.title}</article>
}
```

### Caching and Memoization

#### Fetch Memoization (Automatic)
```typescript
// React automatically deduplicates identical fetch requests in a render pass
async function getPost(id: string) {
  const res = await fetch(`https://api.vercel.app/blog/${id}`, {
    cache: 'force-cache'
  })
  return res.json()
}

export async function generateMetadata({ params }) {
  const post = await getPost(params.id) // Fetch 1
  return { title: post.title }
}

export default async function Page({ params }) {
  const post = await getPost(params.id) // Fetch 1 (reused, not duplicated)
  return <article>{post.content}</article>
}
```

#### React Cache for Non-Fetch Requests
```typescript
import { cache } from 'react'
import 'server-only'

// Wrap database calls with cache()
export const getPost = cache(async (id: string) => {
  const post = await db.posts.findUnique({ where: { id } })
  return post
})
```

### Route Segment Config

Control caching behavior at the route level:

```typescript
// app/posts/[slug]/page.tsx

// Force dynamic rendering (no caching)
export const dynamic = 'force-dynamic'

// Or set revalidation period
export const revalidate = 3600 // Revalidate every hour

// Control fetch cache default
export const fetchCache = 'default-no-store' // All fetches default to no-store
```

### Security: Prevent Data Exposure

Use `server-only` package to ensure server code never bundles to client:

```typescript
// lib/db.ts
import 'server-only'

export async function getSecretData() {
  // This code will error if accidentally imported in a Client Component
  const secret = process.env.SECRET_KEY
  return await db.query(...)
}
```

### Navigation Hooks (Client Components Only)

```typescript
'use client'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export default function Nav() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  return (
    <button onClick={() => router.push('/posts')}>
      Go to Posts
    </button>
  )
}
```

### Loading States

Create `loading.tsx` for automatic loading UI:

```typescript
// app/posts/loading.tsx
export default function Loading() {
  return <div>Loading posts...</div>
}

// Automatically wraps page.tsx in Suspense
```

### Error Handling

Create `error.tsx` for error boundaries:

```typescript
// app/posts/error.tsx
'use client' // Error boundaries must be Client Components

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

## Key Implementation Notes

### Path Aliases
- Use `@/*` for all src imports (e.g., `@/components/*`, `@/lib/*`)

### Font Variables
- Geist Sans: `--font-geist-sans`
- Geist Mono: `--font-geist-mono`
- Bridge to Tailwind via `font-sans` and `font-mono` utilities

### Static Site Generation
Use Next.js ISR (Incremental Static Regeneration) for article pages:
- Generate static paths for all prefectures using `generateStaticParams()`
- Set `revalidate = 3600` for hourly updates
- Use `revalidatePath()` or `revalidateTag()` for on-demand revalidation
- Optimize for SEO and performance (target: Lighthouse 90+)

### Image Handling
- Supabase Storage structure: `/thumbnails/YYYY/MM/filename.jpg`
- Use Next.js `<Image>` component for automatic optimization
- Lazy load images in card grids
- Store images in `public/` directory for static assets (auto-cached)

### Migration Strategy
80+ existing articles will be migrated from Excel:
1. Build category hierarchy first
2. Upload images to Supabase Storage
3. Transform Excel → CSV → Supabase via import script
4. Validate data integrity (no orphaned posts, correct category links)

## Environment Variables

Required in `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SITE_URL=https://www.sayo-kotoba.com
```

## Design Philosophy

**"Poetic Psychedelic × Decorative Narrative"**

- Vivid yet elegant (psychedelic vibrancy + Beardsley refinement)
- Line & color contrast (monochrome decorative patterns × vivid category colors)
- Movement & stillness (dynamic elements + poetic space)
- Story through detail (immersive fine details)

Avoid generic blog aesthetics. Every interaction should feel intentional and artistic.

## Performance Targets

- Initial load: <2.5s
- Lighthouse score: 90+
- Support: 375px to 1920px viewports
- Accessibility: alt tags, heading hierarchy, keyboard navigation

## Task Management & Documentation

### Feature Tickets

All development tasks are organized in `/docs` directory as numbered markdown files:

```
docs/
├── 01_project-setup.md
├── 02_database-schema.md
├── 03_design-system.md
├── 04_top-page-layout.md
└── ...
```

### Todo Format

Each ticket contains a Todo checklist using the following format:

```markdown
## Todo

- [ ] Task description
- [ ] Another task
- [×] Completed task (use × not ✓)
```

**Important**: When completing a task, change `- [ ]` to `- [×]` (not `- [x]` or `- [✓]`).

### Ticket Structure

Each ticket should include:
1. **Overview** - Brief description of the feature
2. **Related Files** - Files that will be created/modified
3. **Technical Details** - Implementation specifics
4. **Todo List** - Actionable tasks with `- [ ]` format
5. **References** - Links to relevant documentation

## Critical Files

- `REQUIREMENTS.md` - Complete project specification (1346 lines, bilingual)
- `CLAUDE.md` - This file (development guide with Next.js 15 best practices)
- `tailwind.config.ts` - Design system configuration
- `tsconfig.json` - TypeScript & path alias configuration
- `.mcp.json` - Supabase MCP setup (gitignored, use .example)
- `docs/*.md` - Feature-specific implementation tickets

## Implementation Status

### Completed Tickets (Phase 1)

- ✅ **Ticket 01**: Project Setup - Next.js 15, Supabase, Tailwind CSS, TypeScript
- ✅ **Ticket 02**: Database Schema - Categories, Posts, Hashtags, RLS policies
- ✅ **Ticket 03**: Design System - Color palette, typography, motion variants
- ✅ **Ticket 04**: Top Page Layout - Hero section, responsive layout
- ✅ **Ticket 05**: Filter System - Prefecture/category/hashtag filtering with URL state
- ✅ **Ticket 06**: Card Grid & Post Cards - Responsive grid, hover effects, animations

### Key Components Implemented

**Layout & Navigation**
- `src/app/layout.tsx` - Root layout with font configuration
- `src/components/HeroSection.tsx` - Hero with site title and tagline

**Filtering & Search**
- `src/components/FilterBar.tsx` - Main filter UI (prefecture, sort, hashtags)
- `src/components/PrefectureSelect.tsx` - Prefecture dropdown
- `src/components/SortSelect.tsx` - Sort options (latest, popular, title)
- `src/components/HashtagInput.tsx` - Hashtag autocomplete input
- `src/lib/filter-utils.ts` - Filter state management utilities

**Post Display**
- `src/components/PostGrid.tsx` - Responsive grid with Framer Motion animations
- `src/components/PostCard.tsx` - Article card with thumbnail, title, excerpt
- `src/components/CategoryBadge.tsx` - Category badge with gradient
- `src/components/HashtagList.tsx` - Hashtag display (max 3 visible)

**Utilities**
- `src/lib/types.ts` - TypeScript interfaces (Post, Category, Hashtag, PostWithRelations)
- `src/lib/supabase.ts` - Supabase client factory functions
- `src/lib/category-colors.ts` - Category-to-gradient color mappings
- `src/lib/motion-variants.ts` - Framer Motion animation variants

## Known Issues & Solutions

### Supabase Connection

**Issue**: Initial "Retrying 1/3..." messages during development server startup

**Root Cause**:
- Messages appear during Next.js compilation phase, not during actual data fetching
- Related to initial module loading and compilation, not Supabase connectivity
- Does not affect production builds or actual page functionality

**Solution**:
- Keep Supabase client configuration minimal (avoid custom fetch wrappers)
- Messages are cosmetic and disappear after initial compilation
- Actual query performance is good (Prefectures: ~580ms, Posts: ~100ms)

**Anti-patterns to avoid**:
- ❌ Custom `Keep-Alive` headers (causes `InvalidArgumentError`)
- ❌ Complex `unstable_cache` wrappers with dynamic keys
- ❌ Custom timeout signals in fetch wrappers

### TypeScript Type Safety

**Issue**: `Post` type doesn't include relational data (`post_categories`, `post_hashtags`)

**Solution**: Use `PostWithRelations` type for components that need nested data:

```typescript
// ❌ Wrong - missing relations
interface PostCardProps {
  post: Post
}

// ✅ Correct - includes relations
interface PostCardProps {
  post: PostWithRelations
}
```

### React Hydration Errors

**Issue**: Nested `<a>` tags cause hydration mismatch

**Solution**: Avoid wrapping entire cards in `<Link>`. Instead, link specific elements:

```typescript
// ❌ Wrong - nested links
<Link href={postUrl}>
  <div>
    <h3>{title}</h3>
    <HashtagList /> {/* Contains its own Links */}
  </div>
</Link>

// ✅ Correct - separate links
<article>
  <Link href={postUrl}><h3>{title}</h3></Link>
  <HashtagList /> {/* Links work independently */}
</article>
```

### Filter State Management

**Issue**: Page scrolls to top when filters change

**Solution**: Add `scroll: false` to router.push:

```typescript
router.push(`/?${queryString}`, { scroll: false })
```

**Issue**: Entire page reloads instead of just post section

**Solution**: Wrap PostGrid in Suspense with unique key:

```typescript
<Suspense
  key={`${prefecture}-${hashtags}-${sort}`}
  fallback={<SkeletonCards />}
>
  <PostGrid posts={posts} />
</Suspense>
```

## Performance Considerations

### Data Fetching Strategy

- Use `Promise.all()` for parallel queries (prefectures, hashtags, posts)
- Supabase queries are fast in development (~100-600ms)
- Consider adding ISR with `revalidate` for production

### Image Optimization

- All images use Next.js `<Image>` component
- Lazy loading enabled with `loading="lazy"`
- Responsive sizes: `sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"`

### Animation Performance

- Framer Motion stagger animations on post grid
- Hardware-accelerated transforms (scale, opacity)
- Smooth transitions (200-300ms duration)

## Development Workflow

### Making Changes

1. Edit component/page files
2. Hot reload updates instantly
3. Check browser console for errors
4. Test responsive behavior (375px - 1920px)

### Adding New Filters

1. Update `FilterState` interface in `filter-utils.ts`
2. Add UI component in `FilterBar.tsx`
3. Update `getFilteredPosts()` query in `page.tsx`
4. Add to URL serialization logic

### Debugging Supabase Queries

Add temporary logging to page.tsx:

```typescript
console.time('[Fetch] Posts')
const posts = await getFilteredPosts(filters)
console.timeEnd('[Fetch] Posts')
```

---

**Created**: 2025-11-13
**Updated**: 2025-11-13 (Added implementation status, known issues, and solutions)
**Project Status**: Phase 1 in progress (6/12 tickets completed)
