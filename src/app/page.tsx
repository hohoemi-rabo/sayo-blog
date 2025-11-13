import { Suspense } from 'react'
import HeroSection from '@/components/HeroSection'
import FilterBar from '@/components/FilterBar'
import PostList from '@/components/PostList'
import { createClient } from '@/lib/supabase'
import { Category, Hashtag, Post } from '@/lib/types'

interface HomePageProps {
  searchParams: Promise<{
    prefecture?: string
    category?: string
    hashtags?: string
    sort?: string
    page?: string
  }>
}

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

// Fetch filtered posts
async function getFilteredPosts(filters: {
  prefecture?: string
  hashtags?: string[]
  sort?: string
}): Promise<Post[]> {
  const supabase = createClient()

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
    `
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

  const { data, error } = await query

  if (error) {
    console.error('Error fetching posts:', error)
    return []
  }

  // Client-side hashtag filtering (Supabase doesn't support filtering on nested arrays easily)
  let posts = data || []
  if (filters.hashtags && filters.hashtags.length > 0) {
    posts = posts.filter((post) => {
      const postHashtagSlugs =
        post.post_hashtags?.map((ph: { hashtags: { slug: string } | null }) => ph.hashtags?.slug).filter(Boolean) || []
      return filters.hashtags!.some((tag) => postHashtagSlugs.includes(tag))
    })
  }

  return posts as Post[]
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams
  const prefecture = params.prefecture
  const hashtagsParam = params.hashtags
  const hashtags = hashtagsParam ? hashtagsParam.split(',').filter(Boolean) : undefined
  const sort = params.sort || 'latest'

  const [prefectures, popularHashtags, posts] = await Promise.all([
    getPrefectures(),
    getPopularHashtags(),
    getFilteredPosts({ prefecture, hashtags, sort }),
  ])

  return (
    <>
      <HeroSection />

      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <FilterBar prefectures={prefectures} popularHashtags={popularHashtags} />

        {/* Post results with Suspense */}
        <Suspense
          key={`${prefecture}-${hashtagsParam}-${sort}`}
          fallback={
            <div className="py-8 space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="p-6 bg-background-dark/5 border border-border-decorative rounded-xl animate-pulse"
                >
                  <div className="h-6 bg-background-dark/10 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-background-dark/10 rounded w-full" />
                  <div className="h-4 bg-background-dark/10 rounded w-2/3 mt-2" />
                </div>
              ))}
            </div>
          }
        >
          <PostList posts={posts} />
        </Suspense>
      </section>
    </>
  )
}
