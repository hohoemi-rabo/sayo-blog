import { Suspense } from 'react'
import HeroSection from '@/components/HeroSection'
import FilterBar from '@/components/FilterBar'
import PostGrid from '@/components/PostGrid'
import Pagination from '@/components/Pagination'
import { createClient } from '@/lib/supabase'
import { Category, Hashtag, PostWithRelations } from '@/lib/types'

interface HomePageProps {
  searchParams: Promise<{
    prefecture?: string
    category?: string
    hashtags?: string
    sort?: string
    page?: string
  }>
}

// Enable ISR (Incremental Static Regeneration)
// Pages are statically generated and revalidated every 10 minutes
export const revalidate = 600 // 10 minutes

// Allow dynamic rendering (important for searchParams to work)
export const dynamic = 'force-dynamic'

// Fetch prefectures (top-level categories)
async function getPrefectures(): Promise<Category[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .is('parent_id', null)
    .order('order_num', { ascending: true })

  if (error) {
    console.error('Error fetching prefectures:', error)
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

// Fetch filtered posts with pagination
async function getFilteredPosts(filters: {
  prefecture?: string
  hashtags?: string[]
  sort?: string
  page?: number
  limit?: number
}): Promise<{ posts: PostWithRelations[]; count: number }> {
  const supabase = createClient()
  const page = filters.page || 1
  const limit = filters.limit || 12
  const offset = (page - 1) * limit

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

  // Apply prefecture filter
  if (filters.prefecture) {
    query = query.eq('post_categories.categories.slug', filters.prefecture)
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

  // Apply pagination
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('Error fetching posts:', error)
    return { posts: [], count: 0 }
  }

  // Client-side hashtag filtering (Supabase doesn't support filtering on nested arrays easily)
  let posts = data || []
  let totalCount = count || 0

  if (filters.hashtags && filters.hashtags.length > 0) {
    // For hashtag filtering, we need to fetch all posts first, then filter
    // This is not ideal for large datasets, but works for now
    const allPostsQuery = supabase
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

    if (filters.prefecture) {
      allPostsQuery.eq('post_categories.categories.slug', filters.prefecture)
    }

    switch (filters.sort) {
      case 'popular':
        allPostsQuery.order('view_count', { ascending: false })
        break
      case 'title':
        allPostsQuery.order('title', { ascending: true })
        break
      default:
        allPostsQuery.order('published_at', { ascending: false })
    }

    const { data: allPosts } = await allPostsQuery

    const filteredPosts =
      allPosts?.filter((post) => {
        const postHashtagSlugs =
          post.post_hashtags?.map((ph: { hashtags: { slug: string } | null }) => ph.hashtags?.slug).filter(Boolean) ||
          []
        return filters.hashtags!.some((tag) => postHashtagSlugs.includes(tag))
      }) || []

    totalCount = filteredPosts.length
    posts = filteredPosts.slice(offset, offset + limit)
  }

  return {
    posts: posts as PostWithRelations[],
    count: totalCount,
  }
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams
  const prefecture = params.prefecture
  const hashtagsParam = params.hashtags
  const hashtags = hashtagsParam ? hashtagsParam.split(',').filter(Boolean) : undefined
  const sort = params.sort || 'latest'
  const pageParam = params.page

  // Parse page number first (default to 1, will validate after getting count)
  const requestedPage = pageParam ? parseInt(pageParam, 10) : 1
  const page = isNaN(requestedPage) || requestedPage < 1 ? 1 : requestedPage

  // Fetch data in parallel with the requested page
  const [prefectures, popularHashtags, { posts, count }] = await Promise.all([
    getPrefectures(),
    getPopularHashtags(),
    getFilteredPosts({ prefecture, hashtags, sort, page }),
  ])

  // Calculate total pages and validate current page
  const totalPages = Math.ceil(count / 12)
  const currentPage = page > totalPages && totalPages > 0 ? totalPages : page

  return (
    <>
      <HeroSection />

      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <FilterBar prefectures={prefectures} popularHashtags={popularHashtags} />

        {/* Post results with Suspense */}
        <Suspense
          key={`posts-${prefecture || 'all'}-${hashtagsParam || 'none'}-${sort}-page${currentPage}`}
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
            <PostGrid posts={posts} />
            <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={count} />
          </div>
        </Suspense>
      </section>
    </>
  )
}
