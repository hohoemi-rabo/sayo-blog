import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { articlePath } from '@/lib/seo-utils'
import { cn } from '@/lib/utils'
import UpdatedBadge from './UpdatedBadge'
import {
  formatDateStringDot,
  pickRecentlyUpdatedPostIds,
  toJstDateString,
} from '@/lib/post-updates'

/** 出す記事の数 */
const RECENTLY_UPDATED_COUNT = 3
/**
 * 候補として読む履歴の行数。1 記事に複数行あっても 3 記事そろう数 (記事が少ないうちは全件で足りる)
 */
const HISTORY_FETCH = 60

interface Row {
  post_id: string
  updated_on: string
  post: {
    id: string
    title: string
    slug: string
    thumbnail_url: string | null
    published_at: string | null
    event_ended: boolean
    post_categories: Array<{ categories: { slug: string } | null }> | null
  } | null
}

interface RecentlyUpdatedArticlesProps {
  /** いま見ている記事 (一覧に出さない)。トップでは渡さない */
  currentPostId?: string
  /** article = 記事ページ下部 (関連記事と同じ見出し) / home = トップの Pick Up の上 (Pick Up と同じ見出し) */
  variant?: 'article' | 'home'
}

/**
 * 「最近更新された記事」(Ticket 46)。記事ページ下部とトップ (Pick Up の上) で共用。更新履歴の新しい順に最大 3 件。
 * 「最終更新」が出ている記事だけ (= 初回掲載日より後の履歴がある)。終了イベントは出さない (トップと同じ)。
 * 非公開の記事の履歴は anon の RLS で読めない。1 件も無ければ何も出さない。
 * 記事ページは ISR (1 時間) なので、ほかの記事を更新してからここに並ぶまで最大 1 時間かかる。
 */
export default async function RecentlyUpdatedArticles({
  currentPostId,
  variant = 'article',
}: RecentlyUpdatedArticlesProps) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('post_updates')
    .select(
      `post_id, updated_on,
       post:posts!inner(id, title, slug, thumbnail_url, published_at, event_ended,
         post_categories(categories(slug)))`
    )
    .eq('post.is_published', true)
    .eq('post.event_ended', false)
    .order('updated_on', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(HISTORY_FETCH)

  if (error) {
    console.error('Recently updated posts fetch error:', error)
    return null
  }

  const rows = ((data ?? []) as unknown as Row[]).filter(
    (r) => r.post && (!r.post.published_at || r.updated_on > toJstDateString(r.post.published_at))
  )
  const ids = pickRecentlyUpdatedPostIds(rows, currentPostId ?? null, RECENTLY_UPDATED_COUNT)
  if (ids.length === 0) return null

  // 各記事の最新の履歴 (rows は新しい順なので最初に出てきた行)
  const items = ids.map((id) => rows.find((r) => r.post_id === id)!)

  const isHome = variant === 'home'

  return (
    <section
      className={cn(
        isHome
          ? 'container mx-auto px-4 sm:px-6 lg:px-8 pt-12 md:pt-16'
          : 'mt-16 pt-12 border-t border-border-decorative'
      )}
    >
      {isHome ? (
        // トップは Pick Up と同じ見出しの形 (中央 + 飾り線)
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-playfair font-bold text-text-primary mb-3">
            最近更新された記事
          </h2>
          <div aria-hidden="true" className="flex items-center justify-center">
            <div className="h-px w-12 bg-gradient-to-r from-transparent via-primary to-transparent" />
            <div className="mx-3 w-1.5 h-1.5 rounded-full bg-primary" />
            <div className="h-px w-12 bg-gradient-to-r from-transparent via-primary to-transparent" />
          </div>
        </div>
      ) : (
        <h2 className="text-2xl lg:text-3xl font-playfair font-bold text-text-primary mb-8">
          最近更新された記事
        </h2>
      )}
      <ul className="grid gap-4 md:grid-cols-3">
        {items.map(({ post, updated_on }) => {
          const p = post!
          const href = articlePath(p.post_categories?.[0]?.categories?.slug, p.slug)
          return (
            <li key={p.id}>
              <Link
                href={href}
                className="group flex h-full gap-3 rounded-xl border border-border-decorative/60 bg-white p-3 transition-shadow hover:shadow-decorative"
              >
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-background-dark/5">
                  {p.thumbnail_url && (
                    <Image
                      src={p.thumbnail_url}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="line-clamp-2 font-noto-serif-jp text-sm font-bold leading-snug text-text-primary group-hover:text-primary">
                    {p.title}
                  </p>
                  {/* カードが狭いと「更新」が縦に 2 行へ折れていた → 日付・バッジは折り返さず、行ごと次の行へ回す */}
                  <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-2 font-noto-sans-jp text-xs text-text-secondary">
                    <span className="whitespace-nowrap">
                      最終更新 <time dateTime={updated_on}>{formatDateStringDot(updated_on)}</time>
                    </span>
                    <UpdatedBadge />
                  </div>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
