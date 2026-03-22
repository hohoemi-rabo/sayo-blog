import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Metadata } from 'next'
import InfinitePostGrid from '@/components/InfinitePostGrid'
import PopularHashtags from '@/components/PopularHashtags'
import { createClient } from '@/lib/supabase'
import { SITE_CONFIG } from '@/lib/site-config'
import { Category, PostWithRelations } from '@/lib/types'

interface CategoryPageProps {
  params: Promise<{
    category: string
  }>
  searchParams: Promise<{
    hashtags?: string
    sort?: string
  }>
}

async function getCategory(slug: string): Promise<Category | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !data) return null
  return data
}

async function getCategoryPosts(
  categorySlug: string,
  filters: { hashtags?: string[]; sort?: string }
): Promise<{ posts: PostWithRelations[]; hasMore: boolean }> {
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
    .eq('post_categories.categories.slug', categorySlug)

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

  query = query.range(0, limit - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('Error fetching category posts:', error)
    return { posts: [], hasMore: false }
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
      return { posts: [], hasMore: false }
    }

    const matchingPostIds = [...new Set(postHashtagData.map((ph) => ph.post_id))]

    const hashtagQuery = supabase
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
      .eq('post_categories.categories.slug', categorySlug)

    switch (filters.sort) {
      case 'popular':
        hashtagQuery.order('view_count', { ascending: false })
        break
      case 'title':
        hashtagQuery.order('title', { ascending: true })
        break
      default:
        hashtagQuery.order('published_at', { ascending: false })
    }

    hashtagQuery.range(0, limit - 1)

    const { data: hashtagPosts, count: hashtagCount } = await hashtagQuery

    posts = hashtagPosts || []
    totalCount = hashtagCount || 0
  }

  return {
    posts: posts as PostWithRelations[],
    hasMore: posts.length < totalCount,
  }
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category: slug } = await params
  const category = await getCategory(slug)

  if (!category) return {}

  return {
    title: `${category.name} | ${SITE_CONFIG.name}`,
    description: category.description || `${SITE_CONFIG.name}の${category.name}に関する記事一覧。`,
    alternates: {
      canonical: `${SITE_CONFIG.url}/${slug}`,
    },
  }
}

export const dynamic = 'force-dynamic'

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { category: slug } = await params
  const search = await searchParams

  const category = await getCategory(slug)
  if (!category) notFound()

  const hashtagsParam = search.hashtags
  const hashtags = hashtagsParam ? hashtagsParam.split(',').filter(Boolean) : undefined
  const sort = search.sort || 'latest'

  const { posts, hasMore } = await getCategoryPosts(slug, { hashtags, sort })

  return (
    <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Category header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-playfair font-bold text-text-primary mb-3">
          {category.name}
        </h1>
        {category.description && (
          <p className="text-text-secondary font-noto-sans-jp max-w-2xl mx-auto">
            {category.description}
          </p>
        )}
        <div className="flex items-center justify-center mt-4">
          <div className="h-px w-12 bg-gradient-to-r from-transparent via-primary to-transparent" />
          <div className="mx-3 w-1.5 h-1.5 rounded-full bg-primary" />
          <div className="h-px w-12 bg-gradient-to-r from-transparent via-primary to-transparent" />
        </div>
      </div>

      {/* Post grid with infinite scroll */}
      <Suspense
        key={`category-${slug}-${hashtagsParam || 'none'}-${sort}`}
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
            category={slug}
            hashtags={hashtagsParam}
            sort={sort}
          />
        </div>
      </Suspense>

      {/* Popular Hashtags */}
      <div className="mt-12">
        <PopularHashtags />
      </div>
    </section>
  )
}
