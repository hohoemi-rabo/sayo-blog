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
import { ArticleTypeBadge } from '@/components/ArticleTypeBadge'
import { ArticleUpdateNotice } from '@/components/ArticleUpdateNotice'
import { ArticleUpdateHistory } from '@/components/ArticleUpdateHistory'
import { lastUpdatedOn, type PostUpdateEntry } from '@/lib/post-updates'

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
      ),
      post_updates(updated_on, note)
    `
    )
    .eq('id', id)
    .order('updated_on', { referencedTable: 'post_updates', ascending: false })
    .order('created_at', { referencedTable: 'post_updates', ascending: false })
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

  // 更新履歴 (Ticket 46)。公開ページと同じ出し方
  const updates = (post.post_updates ?? []) as PostUpdateEntry[]
  const lastUpdated = lastUpdatedOn(updates, post.published_at)

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

        {post.article_type && post.article_type !== 'free' && (
          <div className="mt-3">
            <ArticleTypeBadge articleType={post.article_type} />
          </div>
        )}

        <ArticleHero
          title={post.title}
          thumbnail={post.thumbnail_url}
          categories={categories as Category[]}
          publishedAt={post.published_at}
          lastUpdatedOn={lastUpdated}
          viewCount={post.view_count}
          eventEnded={post.event_ended ?? false}
          placeStatus={post.place_status}
          relocationNote={post.relocation_note}
          relocationUrl={post.relocation_url}
          closureNote={post.closure_note}
          belowImage={updates.length > 0 ? <ArticleUpdateNotice latest={updates[0]} /> : undefined}
        />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {headings.length > 0 && (
          <div className="min-[1440px]:hidden">
            <TableOfContents headings={headings} />
          </div>
        )}

        <ArticleBody content={processedHtml} />

        {/* 履歴が無い記事も「初回掲載」の 1 行だけで出す (帯は更新した記事だけ) */}
        {(updates.length > 0 || post.published_at) && (
          <ArticleUpdateHistory updates={updates} publishedAt={post.published_at} />
        )}

        <ArticleMeta
          categories={categories as Category[]}
          hashtags={hashtags as Hashtag[]}
          publishedAt={post.published_at}
          lastUpdatedOn={lastUpdated}
          viewCount={post.view_count}
        />
      </div>

      {headings.length > 0 && (
        <aside className="hidden min-[1440px]:block fixed top-32 right-[max(1rem,calc((100vw-56rem)/2-16rem))] w-56 max-h-[calc(100vh-10rem)] overflow-y-auto">
          <TableOfContents headings={headings} />
        </aside>
      )}
    </article>
  )
}
