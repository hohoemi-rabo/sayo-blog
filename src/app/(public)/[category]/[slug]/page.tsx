import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { createClient } from '@/lib/supabase'
import { Category, Hashtag } from '@/lib/types'
import { SITE_CONFIG } from '@/lib/site-config'
import { truncateDescription, generateCanonicalUrl, extractKeywords } from '@/lib/seo-utils'
import { generateArticleSchema, generateBreadcrumbSchema, JsonLd } from '@/lib/structured-data'
import { processArticleContent } from '@/lib/article-utils'
import ArticleHero from '@/components/ArticleHero'
import ArticleBody from '@/components/ArticleBody'
import ArticleMeta from '@/components/ArticleMeta'
import Breadcrumbs from '@/components/Breadcrumbs'
import ViewCounter from '@/components/ViewCounter'
import RelatedArticles from '@/components/RelatedArticles'
import ScrollProgress from '@/components/ScrollProgress'
import TableOfContents from '@/components/TableOfContents'
import ImageLightbox from '@/components/ImageLightbox'
import ReactionBar from '@/components/ReactionBar'
import ScrollFadeIn from '@/components/ScrollFadeIn'

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
    const firstCategory = post.post_categories[0]

    return {
      category: firstCategory?.categories.slug || '',
      slug: post.slug,
    }
  })
}

// Dynamic metadata
export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { category, slug } = await params
  const supabase = createClient()

  const { data: post } = await supabase
    .from('posts')
    .select(
      `
      title,
      excerpt,
      thumbnail_url,
      published_at,
      updated_at,
      post_hashtags(hashtags(name))
    `
    )
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (!post) {
    return {
      title: '記事が見つかりません',
    }
  }

  const description = truncateDescription(post.excerpt || post.title)
  const imageUrl = post.thumbnail_url || `${SITE_CONFIG.url}/og-image.png`
  const canonicalUrl = `/${category}/${slug}/`
  const hashtags = (
    post.post_hashtags as unknown as Array<{ hashtags: { name: string } }>
  ).map((ph) => ph.hashtags)

  return {
    title: post.title,
    description,
    keywords: extractKeywords(hashtags),
    authors: [{ name: SITE_CONFIG.author.name }],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: post.title,
      description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
      type: 'article',
      publishedTime: post.published_at || undefined,
      modifiedTime: post.updated_at,
      authors: [SITE_CONFIG.author.name],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description,
      images: [imageUrl],
    },
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const resolvedParams = await params
  const { slug } = resolvedParams
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

  // Extract categories (flat structure)
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

  // Phase 2: 見出しにid付与 + TOC用データ抽出
  const { processedHtml, headings } = processArticleContent(post.content)

  // Build JSON-LD structured data
  const firstCategory = categories[0] as Category | undefined
  const articleSchema = generateArticleSchema(
    post,
    firstCategory?.slug || resolvedParams.category
  )
  const breadcrumbItems = [
    { name: 'ホーム', url: SITE_CONFIG.url },
    ...(firstCategory
      ? [{ name: firstCategory.name, url: generateCanonicalUrl(`/${firstCategory.slug}/`) }]
      : []),
    { name: post.title, url: generateCanonicalUrl(`/${resolvedParams.category}/${post.slug}/`) },
  ]
  const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbItems)

  return (
    <article className="min-h-screen bg-background">
      <JsonLd data={articleSchema} />
      <JsonLd data={breadcrumbSchema} />

      <ViewCounter slug={post.slug} />
      <ScrollProgress />
      <ImageLightbox />

      {/* ヒーロー部分 */}
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
      </div>

      {/* メインコンテンツ + TOC サイドバー */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="lg:flex lg:gap-8">
          {/* メインコンテンツ */}
          <div className="flex-1 min-w-0 max-w-4xl">
            {/* モバイル TOC */}
            {headings.length > 0 && (
              <div className="lg:hidden">
                <TableOfContents headings={headings} />
              </div>
            )}

            <ArticleBody content={processedHtml} />

            <ArticleMeta
              categories={categories as Category[]}
              hashtags={hashtags as Hashtag[]}
              publishedAt={post.published_at}
              updatedAt={post.updated_at}
              viewCount={post.view_count}
            />

            <ReactionBar postId={post.id} />
          </div>

          {/* デスクトップ TOC サイドバー */}
          {headings.length > 0 && (
            <aside className="hidden lg:block w-56 flex-shrink-0">
              <TableOfContents headings={headings} />
            </aside>
          )}
        </div>
      </div>

      {/* 関連記事 */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <ScrollFadeIn>
          <RelatedArticles
            postId={post.id}
            categoryIds={categories.map((c) => c.id)}
            hashtagSlugs={hashtags.map((h) => h.slug)}
          />
        </ScrollFadeIn>
      </div>
    </article>
  )
}
