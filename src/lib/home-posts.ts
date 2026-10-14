import { createClient } from '@/lib/supabase'
import { PostWithRelations } from '@/lib/types'

/**
 * トップページに並べる記事をまとめて決める (Ticket 44)。
 *
 * - feature (特集): おすすめ (is_featured) の最新 1 件。無ければ最新記事
 * - notices (まちのお知らせ): 「イベント・講座」の記事 3 件 (下の並び順)
 * - report (レポート): 上の 2 枠に出ていない最新記事 1 件
 * - pickup (Pick Up): 上の 3 枠に出ていない記事を、おすすめ → 最新の順で 6 件
 *
 * 同じ記事が複数の枠に出ないよう、決める順に「使用済み」を積んでいく。
 * クエリは 3 本を並列で 1 回ずつ (枠ごとに取り直さない)。
 */

const SELECT = `
  *,
  post_categories!inner(
    categories!inner(id, slug, name, parent_id)
  ),
  post_hashtags(
    hashtags(id, name, slug, count)
  )
`

export const NOTICE_CATEGORY_SLUG = 'event'
const NOTICE_COUNT = 3
const PICKUP_COUNT = 6

export interface HomePosts {
  feature: PostWithRelations | null
  report: PostWithRelations | null
  notices: PostWithRelations[]
  pickup: PostWithRelations[]
}

export async function getHomePosts(): Promise<HomePosts> {
  const supabase = createClient()

  const [featuredRes, latestRes, eventRes] = await Promise.all([
    supabase
      .from('posts')
      .select(SELECT)
      .eq('is_published', true)
      .eq('is_featured', true)
      .order('published_at', { ascending: false })
      .limit(PICKUP_COUNT + 2),
    supabase
      .from('posts')
      .select(SELECT)
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(PICKUP_COUNT + NOTICE_COUNT + 6),
    supabase
      .from('posts')
      .select(SELECT)
      .eq('is_published', true)
      .eq('post_categories.categories.slug', NOTICE_CATEGORY_SLUG)
      .order('published_at', { ascending: false })
      .limit(20),
  ])

  for (const [name, res] of [['featured', featuredRes], ['latest', latestRes], ['event', eventRes]] as const) {
    if (res.error) console.error(`Error fetching home ${name} posts:`, res.error)
  }

  const featured = (featuredRes.data ?? []) as PostWithRelations[]
  const latest = (latestRes.data ?? []) as PostWithRelations[]
  const events = (eventRes.data ?? []) as PostWithRelations[]

  const used = new Set<string>()
  const take = (post: PostWithRelations | undefined) => {
    if (!post) return null
    used.add(post.id)
    return post
  }
  const unused = (posts: PostWithRelations[]) => posts.filter((p) => !used.has(p.id))

  const feature = take(featured[0] ?? latest[0])
  const notices = sortNotices(unused(events)).slice(0, NOTICE_COUNT)
  notices.forEach((p) => used.add(p.id))
  const report = take(unused(latest)[0])
  const pickup = dedupeById([...unused(featured), ...unused(latest)]).slice(0, PICKUP_COUNT)

  return { feature, report, notices, pickup }
}

/**
 * お知らせの並び:
 * 1. 開催日が今日以降のもの (開催日の近い順)
 * 2. 開催日の入っていない、終了していないもの (新しい順)
 * 3. 終了したもの (新しい順) — 件数が足りないときの埋め合わせ
 * 現状は開催日が未入力の記事ばかりなので実質 2 → 3。開催日が入り始めたら自動で 1 が先頭に来る。
 */
function sortNotices(posts: PostWithRelations[]): PostWithRelations[] {
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }) // YYYY-MM-DD (JST)

  const rank = (p: PostWithRelations) => {
    const lastDay = p.event_date_end ?? p.event_date_start
    if (!p.event_ended && lastDay && lastDay >= today) return 0
    if (!p.event_ended) return 1
    return 2
  }

  // Array.prototype.sort は安定ソートなので、同じ順位の中では元の「新しい順」が保たれる
  return [...posts].sort((a, b) => {
    const diff = rank(a) - rank(b)
    if (diff !== 0) return diff
    if (rank(a) === 0) return (a.event_date_start ?? '').localeCompare(b.event_date_start ?? '')
    return 0
  })
}

function dedupeById(posts: PostWithRelations[]): PostWithRelations[] {
  const seen = new Set<string>()
  return posts.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
}

/** 記事の URL (/{カテゴリ}/{slug}) */
export function postHref(post: PostWithRelations): string {
  const category = post.post_categories?.[0]?.categories
  return category ? `/${category.slug}/${post.slug}` : `/${post.slug}`
}

/** 2026.4.12 形式 (JST) */
export function formatDotDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(new Date(iso))
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('year')}.${get('month')}.${get('day')}`
}
