import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Pencil } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase'
import type { Category, Hashtag } from '@/lib/types'
import { processArticleContent } from '@/lib/article-utils'
import ArticleHero from '@/components/ArticleHero'
import ArticleBody from '@/components/ArticleBody'
import ArticleMeta from '@/components/ArticleMeta'
import Breadcrumbs from '@/components/Breadcrumbs'
import ScrollProgress from '@/components/ScrollProgress'
import TableOfContents from '@/components/TableOfContents'
import ImageLightbox from '@/components/ImageLightbox'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PostPreviewPage({ params }: PageProps) {
  const { id } = await params
  const supabase = createAdminClient()

  // Fetch by id without the is_published filter so drafts are visible.
  const { data: post, error } = await supabase
    .from('posts')
    .select(
      `
      *,
      post_categories(
        categories(id, name, slug, parent_id)
      ),
      post_hashtags(
        hashtags(id, name, slug, count)
      )
    `
    )
    .eq('id', id)
    .maybeSingle()

  if (error || !post) {
    notFound()
  }

  const categories = (
    (post.post_categories ?? []) as Array<{
      categories: {
        id: string
        name: string
        slug: string
        parent_id: string | null
      } | null
    }>
  )
    .map((pc) => pc.categories)
    .filter((c): c is NonNullable<typeof c> => c !== null)

  const hashtags = (
    (post.post_hashtags ?? []) as Array<{
      hashtags: { id: string; name: string; slug: string; count: number } | null
    }>
  )
    .map((ph) => ph.hashtags)
    .filter((h): h is NonNullable<typeof h> => h !== null)

  const { processedHtml, headings } = processArticleContent(post.content ?? '')

  return (
    <article className="min-h-screen bg-background">
      <ScrollProgress />
      <ImageLightbox />

      {/* Preview banner — only visible in admin preview, never in public output */}
      <div className="sticky top-0 z-40 border-b border-amber-300 bg-amber-50/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-sm">
            <span className="inline-flex items-center rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">
              {post.is_published ? 'プレビュー（公開済み）' : '下書きプレビュー'}
            </span>
            <span className="text-amber-900">
              この画面は管理者のみ閲覧できます
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/posts/${id}`}
              className="inline-flex items-center gap-1 rounded-md border border-amber-400 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100"
            >
              <Pencil className="h-4 w-4" />
              編集に戻る
            </Link>
            <Link
              href="/admin/posts"
              className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-amber-900 hover:bg-amber-100"
            >
              <ArrowLeft className="h-4 w-4" />
              一覧
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs categories={categories as Category[]} title={post.title} />

        <ArticleHero
          title={post.title}
          thumbnail={post.thumbnail_url}
          categories={categories as Category[]}
          publishedAt={post.published_at}
          updatedAt={post.updated_at}
          viewCount={post.view_count}
          eventEnded={post.event_ended ?? false}
        />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {headings.length > 0 && (
          <div className="xl:hidden">
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
      </div>

      {headings.length > 0 && (
        <aside className="hidden xl:block fixed top-32 right-[max(1rem,calc((100vw-56rem)/2-16rem))] w-56 max-h-[calc(100vh-10rem)] overflow-y-auto">
          <TableOfContents headings={headings} />
        </aside>
      )}
    </article>
  )
}
