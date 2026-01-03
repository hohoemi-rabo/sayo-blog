import { Suspense } from 'react'
import HeroSection from '@/components/HeroSection'
import FilterBar from '@/components/FilterBar'
import InfinitePostGrid from '@/components/InfinitePostGrid'
import PopularHashtags from '@/components/PopularHashtags'
import { createClient } from '@/lib/supabase'
import { Category, Hashtag, PostWithRelations } from '@/lib/types'

interface HomePageProps {
  searchParams: Promise<{
    category?: string
    hashtags?: string
    sort?: string
  }>
}

// Enable ISR (Incremental Static Regeneration)
// Pages are statically generated and revalidated every 10 minutes
export const revalidate = 600 // 10 minutes

// Allow dynamic rendering (important for searchParams to work)
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

// Fetch initial posts (6 items for infinite scroll)
async function getInitialPosts(filters: {
  category?: string
  hashtags?: string[]
  sort?: string
}): Promise<{ posts: PostWithRelations[]; count: number; hasMore: boolean }> {
  const supabase = createClient()
  const limit = 6

  let query = supabase
    .from('posts')
    .select(
      `
      *,
      post_categories!inner(
        categories!inner(id, slug, name, parent_id)
      ),
      post_hashtags(
        hashtags(id, name, slug, count)
      )
    `,
      { count: 'exact' }
    )
    .eq('is_published', true)

  // Apply category filter
  if (filters.category) {
    query = query.eq('post_categories.categories.slug', filters.category)
  }

  // Apply sort
  switch (filters.sort) {
    case 'popular':
      query = query.order('view_count', { ascending: false })
      break
    case 'title':
      query = query.order('title', { ascending: true })
      break
    default:
      query = query.order('published_at', { ascending: false })
  }

  // Initial load: first 6 items
  query = query.range(0, limit - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('Error fetching posts:', error)
    return { posts: [], count: 0, hasMore: false }
  }

  let posts = data || []
  let totalCount = count || 0

  // Handle hashtag filtering
  if (filters.hashtags && filters.hashtags.length > 0) {
    const { data: postHashtagData } = await supabase
      .from('post_hashtags')
      .select('post_id, hashtags!inner(slug)')
      .in('hashtags.slug', filters.hashtags)

    if (!postHashtagData || postHashtagData.length === 0) {
      return { posts: [], count: 0, hasMore: false }
    }

    const matchingPostIds = [...new Set(postHashtagData.map((ph) => ph.post_id))]

    const hashtagPostsQuery = supabase
      .from('posts')
      .select(
        `
        *,
        post_categories!inner(
          categories!inner(id, slug, name, parent_id)
        ),
        post_hashtags(
          hashtags(id, name, slug, count)
        )
      `,
        { count: 'exact' }
      )
      .in('id', matchingPostIds)
      .eq('is_published', true)

    if (filters.category) {
      hashtagPostsQuery.eq('post_categories.categories.slug', filters.category)
    }

    switch (filters.sort) {
      case 'popular':
        hashtagPostsQuery.order('view_count', { ascending: false })
        break
      case 'title':
        hashtagPostsQuery.order('title', { ascending: true })
        break
      default:
        hashtagPostsQuery.order('published_at', { ascending: false })
    }

    hashtagPostsQuery.range(0, limit - 1)

    const { data: hashtagPosts, count: hashtagCount } = await hashtagPostsQuery

    posts = hashtagPosts || []
    totalCount = hashtagCount || 0
  }

  return {
    posts: posts as PostWithRelations[],
    count: totalCount,
    hasMore: posts.length < totalCount,
  }
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams
  const category = params.category
  const hashtagsParam = params.hashtags
  const hashtags = hashtagsParam ? hashtagsParam.split(',').filter(Boolean) : undefined
  const sort = params.sort || 'latest'

  // Fetch data in parallel
  const [categories, popularHashtags, { posts, hasMore }] = await Promise.all([
    getCategories(),
    getPopularHashtags(),
    getInitialPosts({ category, hashtags, sort }),
  ])

  return (
    <>
      <HeroSection />

      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <FilterBar categories={categories} popularHashtags={popularHashtags} />

        {/* Post results with Suspense */}
        <Suspense
          key={`posts-${category || 'all'}-${hashtagsParam || 'none'}-${sort}`}
          fallback={
            <div className="py-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="bg-background border border-border-decorative rounded-xl overflow-hidden animate-pulse"
                  >
                    <div className="aspect-[4/3] bg-background-dark/10" />
                    <div className="p-5 space-y-3">
                      <div className="h-6 bg-background-dark/10 rounded w-3/4" />
                      <div className="h-4 bg-background-dark/10 rounded w-full" />
                      <div className="h-4 bg-background-dark/10 rounded w-5/6" />
                      <div className="flex gap-2">
                        <div className="h-6 bg-background-dark/10 rounded w-16" />
                        <div className="h-6 bg-background-dark/10 rounded w-16" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          }
        >
          <div className="py-8">
            <InfinitePostGrid
              initialPosts={posts}
              initialHasMore={hasMore}
              category={category}
              hashtags={hashtagsParam}
              sort={sort}
            />
          </div>
        </Suspense>

        {/* Popular Hashtags Cloud */}
        <div className="mt-12">
          <PopularHashtags />
        </div>
      </section>
    </>
  )
}
