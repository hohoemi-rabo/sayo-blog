---
paths:
  - "src/app/**"
  - "src/components/**"
---

# Next.js 15 App Router Patterns

## Server Components First (Default)

Always use Server Components by default. Only add `'use client'` when you need:
- React hooks (useState, useEffect, etc.)
- Event handlers (onClick, onChange, etc.)
- Browser APIs (localStorage, window, etc.)
- Third-party libraries that use client-only features

## Data Fetching Strategies

### ISR (default for this project)
```typescript
export const revalidate = 3600 // 1 hour for article pages
export const revalidate = 600  // 10 min for home page
```

### Dynamic rendering
```typescript
export const dynamic = 'force-dynamic' // Required for searchParams to work
```

**IMPORTANT**: `revalidate` and `force-dynamic` are mutually exclusive. `force-dynamic` overrides `revalidate`. Use `force-dynamic` only for pages that read `searchParams`. Use `revalidate` for all other pages.

### On-Demand Revalidation
```typescript
'use server'
import { revalidatePath, revalidateTag } from 'next/cache'
export async function updatePost() {
  await db.posts.update(...)
  revalidatePath('/posts')
}
```

## Request Deduplication with React.cache()

Use `cache()` from React to deduplicate Supabase queries between `generateMetadata` and the page component:
```typescript
import { cache } from 'react'

const getCategory = cache(async (slug: string) => {
  const supabase = createClient()
  const { data } = await supabase.from('categories').select('*').eq('slug', slug).single()
  return data
})

// Called in both generateMetadata and CategoryPage — only 1 DB query
```

**Current usage**:
- `[category]/page.tsx` — `getCategory()` cached
- `[category]/[slug]/page.tsx` — `getPost()` cached (shared between metadata and page)

## Composition Patterns

### Pass Server Data to Client Components
```typescript
// Fetch in Server Component, pass to Client Component
export default async function Page() {
  const posts = await getPosts()
  return <ClientPostList posts={posts} />
}
```

### Dynamic Import for Heavy Client Components
Use `next/dynamic` to lazy-load heavy client components, especially when conditionally rendered:
```typescript
import nextDynamic from 'next/dynamic'

const HeavyComponent = nextDynamic(
  () => import('@/components/HeavyComponent').then((mod) => ({ default: mod.HeavyComponent })),
  { loading: () => <Skeleton /> }
)
```

**Note**: `ssr: false` cannot be used in Server Components. Use it only in Client Components.

**Current usage**:
- `chat/page.tsx` — `ChatPage` dynamically imported (admin-only, heavy)
- `admin/editor/RichTextEditor.tsx` — `RichTextEditorClient` dynamically imported with `ssr: false`

## Parallel Data Fetching

Avoid waterfalls - fetch data in parallel:
```typescript
const [artist, albums] = await Promise.all([getArtist(), getAlbums()])
```

## Streaming with Suspense

```typescript
<Suspense fallback={<PostsSkeleton />}>
  <Posts />
</Suspense>
```

**重要**: データをページ本体で `await` してから Suspense に渡すと fallback は一度も表示されない (飾りになる)。
取得は Suspense 内の **async 子コンポーネント**で行うこと。また async Server Component は
Suspense で包まないとシェル全体の初回描画をブロックする。

**Current usage** (2026-07-07 リファクタ済み):
- `/blog` — `BlogPosts` (Suspense 子) が posts 取得。FilterBar が先に描画され `PostGridSkeleton` → 一覧の順でストリーミング
- `/[category]` — `CategoryPosts` 同様 (getCategory → posts の直列 waterfall も解消)
- `/search` — `SearchResults` 同様 (ヘッダー/検索バーが先に描画)
- `PopularHashtags` / 記事詳細の `RelatedArticles` — 独自クエリを持つ async コンポーネントなので `<Suspense fallback={null}>` で包む

## Shared Posts List Query

公開記事一覧のクエリは `src/lib/post-queries.ts::fetchPublishedPosts({ category, hashtags, sort, offset, limit })` に一本化済み。
`/blog`・`/[category]`・`/api/posts` はすべてこれを使う (個別にクエリを書かない)。
ハッシュタグ絞り込みは対象 post_id の解決を先に 1 回だけ行う設計 (絞り込み無しの結果を取って捨てる旧実装の無駄を排除)。
一覧のスケルトンは `src/components/PostGridSkeleton.tsx` を共用。

## Route Handlers

- Route Handlers are for API endpoints accessed by Client Components
- Do NOT call Route Handlers from Server Components

## Static Params Generation

```typescript
export async function generateStaticParams() {
  // Pre-render top 30 articles by view count
}
export const dynamicParams = true
```

## Route Segment Config

```typescript
export const dynamic = 'force-dynamic'  // No caching (for searchParams pages)
export const revalidate = 3600          // Revalidate every hour (for static pages)
```

## Loading & Error States

- `loading.tsx` for automatic loading UI with Suspense
- `error.tsx` for error boundaries (must be Client Components)

## Navigation (Client Components Only)

```typescript
'use client'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
```
