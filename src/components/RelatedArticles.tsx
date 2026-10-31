import { createClient } from '@/lib/supabase'
import PostCard from './PostCard'
import { PostWithRelations } from '@/lib/types'
import {
  RELATED_POSTS_COUNT,
  selectRelatedPostIds,
  type ManualRelatedPick,
  type RelatedCandidate,
} from '@/lib/related-posts'

interface RelatedArticlesProps {
  postId: string
  categoryIds: string[]
  hashtagSlugs: string[]
}

const CARD_SELECT = `
  *,
  post_categories!inner(categories!inner(id, name, slug, parent_id)),
  post_hashtags(hashtags(id, name, slug, count))
`

/** 選定用は本文 (content) を取らない軽い列だけ。カードと同じくカテゴリ無しの記事は除く */
const CANDIDATE_SELECT = `
  id, published_at, is_published, event_ended,
  post_categories!inner(category_id),
  post_hashtags(hashtags(slug))
`

/**
 * 他カテゴリ補完用に取る新しい記事の数。同カテゴリで足りないときだけ使うので、
 * 自分 + 手動 3 件 + 同カテゴリの記事 (足りない = 高々数件) を除いても 3 件残る数にする
 */
const FALLBACK_FETCH = 12

interface CandidateRow {
  id: string
  published_at: string | null
  is_published: boolean
  event_ended: boolean
  post_hashtags: Array<{ hashtags: { slug: string } | null }> | null
}

function toCandidate(row: CandidateRow): RelatedCandidate {
  return {
    id: row.id,
    publishedAt: row.published_at,
    isPublished: row.is_published,
    eventEnded: row.event_ended,
    hashtagSlugs: (row.post_hashtags ?? []).flatMap((ph) =>
      ph.hashtags ? [ph.hashtags.slug] : []
    ),
  }
}

/**
 * 記事ページ下部の関連記事 (Ticket 45)。手動選択 → 同カテゴリの自動選定 → 他カテゴリの新しい記事。
 * 選び方は `src/lib/related-posts.ts` (テストあり)。ここは取得と描画だけ。
 */
export default async function RelatedArticles({
  postId,
  categoryIds,
  hashtagSlugs,
}: RelatedArticlesProps) {
  const supabase = createClient()

  const candidates = () =>
    supabase
      .from('posts')
      .select(CANDIDATE_SELECT)
      .eq('is_published', true)
      .eq('event_ended', false)
      .neq('id', postId)

  const [manualRes, sameRes, fallbackRes] = await Promise.all([
    // 非公開の記事は anon の RLS で related が null になる → 表示しない
    supabase
      .from('post_related_posts')
      .select(
        'position, related:posts!post_related_posts_related_post_id_fkey(id, is_published, event_ended)'
      )
      .eq('post_id', postId)
      .order('position'),
    categoryIds.length > 0
      ? candidates().in('post_categories.category_id', categoryIds)
      : Promise.resolve({ data: [], error: null }),
    candidates().order('published_at', { ascending: false }).limit(FALLBACK_FETCH),
  ])

  for (const [name, res] of [
    ['manual', manualRes],
    ['sameCategory', sameRes],
    ['fallback', fallbackRes],
  ] as const) {
    if (res.error) console.error(`[RelatedArticles] ${name} query failed:`, res.error)
  }

  const manual: ManualRelatedPick[] = (
    (manualRes.data ?? []) as unknown as Array<{
      related: { id: string; is_published: boolean; event_ended: boolean } | null
    }>
  ).flatMap((row) =>
    row.related
      ? [
          {
            id: row.related.id,
            isPublished: row.related.is_published,
            eventEnded: row.related.event_ended,
          },
        ]
      : []
  )

  const ids = selectRelatedPostIds({
    postId,
    hashtagSlugs,
    manual,
    sameCategory: ((sameRes.data ?? []) as unknown as CandidateRow[]).map(toCandidate),
    fallback: ((fallbackRes.data ?? []) as unknown as CandidateRow[]).map(toCandidate),
    limit: RELATED_POSTS_COUNT,
  })
  if (ids.length === 0) return null

  const { data: posts, error } = await supabase
    .from('posts')
    .select(CARD_SELECT)
    .in('id', ids)
    .eq('is_published', true)
  if (error) console.error('[RelatedArticles] cards query failed:', error)

  const byId = new Map((posts ?? []).map((p) => [p.id as string, p as PostWithRelations]))
  const relatedPosts = ids.flatMap((id) => {
    const p = byId.get(id)
    return p ? [p] : []
  })

  if (relatedPosts.length === 0) return null

  return (
    <section className="mt-16 pt-12 border-t border-border-decorative">
      <h2 className="text-2xl lg:text-3xl font-playfair font-bold text-text-primary mb-8">
        関連記事
      </h2>
      {/* デスクトップ: 3カラムgrid */}
      <div className="hidden md:grid md:grid-cols-3 gap-6">
        {relatedPosts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
      {/* モバイル: 横スクロール */}
      <div className="md:hidden flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4">
        {relatedPosts.map((post) => (
          <div key={post.id} className="flex-shrink-0 w-[280px] snap-start">
            <PostCard post={post} />
          </div>
        ))}
      </div>
    </section>
  )
}
