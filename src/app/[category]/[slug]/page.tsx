import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { createClient } from '@/lib/supabase'
import { Category, Hashtag } from '@/lib/types'
import ArticleHero from '@/components/ArticleHero'
import ArticleBody from '@/components/ArticleBody'
import ArticleMeta from '@/components/ArticleMeta'
import Breadcrumbs from '@/components/Breadcrumbs'
import ViewCounter from '@/components/ViewCounter'

export const revalidate = 3600 // 1 hour ISR

interface ArticlePageProps {
  params: Promise<{
    category: string
    slug: string
  }>
}

// Pre-render top 30 articles
export async function generateStaticParams() {
  const supabase = createClient()

  const { data: posts } = await supabase
    .from('posts')
    .select(
      `
      slug,
      post_categories!inner(
        categories!inner(slug)
      )
    `
    )
    .eq('is_published', true)
    .order('view_count', { ascending: false })
    .limit(30)

  if (!posts) return []

  type PostCategory = {
    categories: {
      slug: string
    }
  }

  type PostData = {
    slug: string
    post_categories: PostCategory[]
  }

  return (posts as unknown as PostData[]).map((post) => {
    // Get the first category (flat structure now)
    const firstCategory = post.post_categories[0]

    return {
      category: firstCategory?.categories.slug || '',
      slug: post.slug,
    }
  })
}

// Dynamic metadata
export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = createClient()

  const { data: post } = await supabase
    .from('posts')
    .select('title, excerpt, thumbnail_url, published_at, updated_at')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (!post) {
    return {
      title: 'Article Not Found | Sayo\'s Journal',
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.sayo-kotoba.com'
  const imageUrl = post.thumbnail_url || `${siteUrl}/og-image.jpg`

  return {
    title: `${post.title} | Sayo's Journal`,
    description: post.excerpt || post.title,
    openGraph: {
      title: post.title,
      description: post.excerpt || post.title,
      images: [imageUrl],
      type: 'article',
      publishedTime: post.published_at || undefined,
      modifiedTime: post.updated_at,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt || post.title,
      images: [imageUrl],
    },
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params
  const supabase = createClient()

  // Fetch post with all relations
  const { data: post, error } = await supabase
    .from('posts')
    .select(
      `
      *,
      post_categories!inner(
        categories!inner(id, name, slug, parent_id)
      ),
      post_hashtags(
        hashtags(id, name, slug, count)
      )
    `
    )
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (error || !post) {
    notFound()
  }

  // Extract categories (flat structure now)
  const categories = (
    post.post_categories as Array<{
      categories: { id: string; name: string; slug: string; parent_id: string | null }
    }>
  ).map((pc) => pc.categories)

  // Extract hashtags
  const hashtags = (
    post.post_hashtags as Array<{
      hashtags: { id: string; name: string; slug: string; count: number }
    }>
  ).map((ph) => ph.hashtags)

  return (
    <article className="min-h-screen bg-background">
      {/* ViewCounter increments view count on mount (Client Component) */}
      <ViewCounter slug={post.slug} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs categories={categories as Category[]} title={post.title} />

        <ArticleHero
          title={post.title}
          thumbnail={post.thumbnail_url}
          categories={categories as Category[]}
          publishedAt={post.published_at}
          updatedAt={post.updated_at}
          viewCount={post.view_count}
        />

        <ArticleBody content={post.content} />

        <ArticleMeta
          categories={categories as Category[]}
          hashtags={hashtags as Hashtag[]}
          publishedAt={post.published_at}
          updatedAt={post.updated_at}
          viewCount={post.view_count}
        />
      </div>
    </article>
  )
}
