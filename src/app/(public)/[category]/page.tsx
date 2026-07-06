import { cache } from 'react'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Metadata } from 'next'
import InfinitePostGrid from '@/components/InfinitePostGrid'
import PopularHashtags from '@/components/PopularHashtags'
import PostGridSkeleton from '@/components/PostGridSkeleton'
import { createClient } from '@/lib/supabase'
import { fetchPublishedPosts } from '@/lib/post-queries'
import { SITE_CONFIG } from '@/lib/site-config'
import { Category } from '@/lib/types'

interface CategoryPageProps {
  params: Promise<{
    category: string
  }>
  searchParams: Promise<{
    hashtags?: string
    sort?: string
  }>
}

const getCategory = cache(async (slug: string): Promise<Category | null> => {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !data) return null
  return data
})

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

// Suspense 内で posts を取得し、カテゴリヘッダーより後からストリーミングする
async function CategoryPosts({
  slug,
  hashtags,
  hashtagsParam,
  sort,
}: {
  slug: string
  hashtags?: string[]
  hashtagsParam?: string
  sort: string
}) {
  const { posts, hasMore } = await fetchPublishedPosts({ category: slug, hashtags, sort })

  return (
    <div className="py-8">
      <InfinitePostGrid
        initialPosts={posts}
        initialHasMore={hasMore}
        category={slug}
        hashtags={hashtagsParam}
        sort={sort}
      />
    </div>
  )
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const [{ category: slug }, search] = await Promise.all([params, searchParams])

  const category = await getCategory(slug)
  if (!category) notFound()

  const hashtagsParam = search.hashtags
  const hashtags = hashtagsParam ? hashtagsParam.split(',').filter(Boolean) : undefined
  const sort = search.sort || 'latest'

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
        fallback={<PostGridSkeleton />}
      >
        <CategoryPosts
          slug={slug}
          hashtags={hashtags}
          hashtagsParam={hashtagsParam}
          sort={sort}
        />
      </Suspense>

      {/* Popular Hashtags (async fetch — シェルをブロックしないよう Suspense) */}
      <div className="mt-12">
        <Suspense fallback={null}>
          <PopularHashtags />
        </Suspense>
      </div>
    </section>
  )
}
