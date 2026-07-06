import { Suspense } from 'react'
import { Metadata } from 'next'
import FilterBar from '@/components/FilterBar'
import InfinitePostGrid from '@/components/InfinitePostGrid'
import PopularHashtags from '@/components/PopularHashtags'
import PostGridSkeleton from '@/components/PostGridSkeleton'
import { createClient } from '@/lib/supabase'
import { fetchPublishedPosts } from '@/lib/post-queries'
import { SITE_CONFIG } from '@/lib/site-config'
import { Category, Hashtag } from '@/lib/types'

interface BlogPageProps {
  searchParams: Promise<{
    category?: string
    hashtags?: string
    sort?: string
  }>
}

export const metadata: Metadata = {
  title: `ブログ | ${SITE_CONFIG.name}`,
  description: `${SITE_CONFIG.name}の記事一覧。グルメ、イベント、スポット、カルチャー、ニュースなど、南信州の魅力を発信しています。`,
  alternates: {
    canonical: `${SITE_CONFIG.url}/blog`,
  },
}

export const dynamic = 'force-dynamic'

// Fetch categories (flat structure now)
async function getCategories(): Promise<Category[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('order_num', { ascending: true })

  if (error) {
    console.error('Error fetching categories:', error)
    return []
  }

  return data || []
}

// Fetch popular hashtags
async function getPopularHashtags(): Promise<Hashtag[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('hashtags')
    .select('*')
    .order('count', { ascending: false })
    .limit(20)

  if (error) {
    console.error('Error fetching hashtags:', error)
    return []
  }

  return data || []
}

// Suspense 内で posts を取得し、FilterBar より後からストリーミングする
async function BlogPosts({
  category,
  hashtags,
  hashtagsParam,
  sort,
}: {
  category?: string
  hashtags?: string[]
  hashtagsParam?: string
  sort: string
}) {
  const { posts, hasMore } = await fetchPublishedPosts({ category, hashtags, sort })

  return (
    <div className="py-8">
      <InfinitePostGrid
        initialPosts={posts}
        initialHasMore={hasMore}
        category={category}
        hashtags={hashtagsParam}
        sort={sort}
      />
    </div>
  )
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = await searchParams
  const category = params.category
  const hashtagsParam = params.hashtags
  const hashtags = hashtagsParam ? hashtagsParam.split(',').filter(Boolean) : undefined
  const sort = params.sort || 'latest'

  // FilterBar 用の軽量データのみ先に並列取得 (posts は Suspense 内でストリーミング)
  const [categories, popularHashtags] = await Promise.all([
    getCategories(),
    getPopularHashtags(),
  ])

  return (
    <>
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <FilterBar categories={categories} popularHashtags={popularHashtags} />

        {/* Post results with Suspense */}
        <Suspense
          key={`posts-${category || 'all'}-${hashtagsParam || 'none'}-${sort}`}
          fallback={<PostGridSkeleton />}
        >
          <BlogPosts
            category={category}
            hashtags={hashtags}
            hashtagsParam={hashtagsParam}
            sort={sort}
          />
        </Suspense>

        {/* Popular Hashtags Cloud (async fetch — シェルをブロックしないよう Suspense) */}
        <div className="mt-12">
          <Suspense fallback={null}>
            <PopularHashtags />
          </Suspense>
        </div>
      </section>
    </>
  )
}
