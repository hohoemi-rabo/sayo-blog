import { createClient } from '@/lib/supabase'
import { PostWithRelations } from '@/lib/types'
import { PICKUP_COUNT } from '@/lib/home-slots'

/**
 * トップページに並べる記事をまとめて決める (Ticket 44 / 2026-10-31 に枠の役割を変更)。
 *
 * - pickup (Pick Up): ★ (is_featured, 最大 6 件) の記事を新しい順に全部。6 件に満たない分は新しい記事で埋める
 * - report (みんなの投稿): 公開中の投稿記事 (article_type='mini') の最新 1 件。無ければ枠ごと出さない
 * - feature (特集): 取材記事 (long) の最新 1 件。取材記事が無いうちは新しい記事。
 *   ★は Pick Up に全部並べるため、特集には★の記事を使わない
 * - randomPosts (右枠): 上の 3 枠に出ていない記事からランダムに 3 件。
 *   終了イベント (event_ended) は除く。ISR なので並びは再生成 (1 時間) ごとに変わる
 *   (記事の保存・削除でもトップは作り直されるので、そのときも変わる)
 *
 * 紗代さんの指定は「★は Pick Up に 6 件」「みんなの投稿は常に最新の投稿記事」。
 * 最新の投稿記事に★が付いているときだけ、両方を守るため同じ記事が 2 枠に出る (それ以外は重複しない)。
 * ランダム枠は固定枠を決めてから選ぶ (先に選ぶと固定枠が抽選結果でずれる)。
 * そのため 1 回目は並列 (ランダム候補は id だけ)、2 回目で当選した 3 件の本体を取る。
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

const RANDOM_COUNT = 3
/** ★の上限 (管理画面の toggleFeatured と同じ) = Pick Up の枠数 */
const FEATURED_MAX = PICKUP_COUNT

export interface HomePosts {
  feature: PostWithRelations | null
  /** みんなの投稿 (投稿記事の最新) */
  report: PostWithRelations | null
  randomPosts: PostWithRelations[]
  pickup: PostWithRelations[]
}

export async function getHomePosts(): Promise<HomePosts> {
  const supabase = createClient()
  const published = () => supabase.from('posts').select(SELECT).eq('is_published', true)

  const [starredRes, latestRes, longRes, miniRes, candidateRes] = await Promise.all([
    published()
      .eq('is_featured', true)
      .order('published_at', { ascending: false })
      .limit(FEATURED_MAX),
    // 特集 (取材記事が無いとき) と Pick Up の穴埋め用。★・みんなの投稿と重なっても足りる件数
    published()
      .order('published_at', { ascending: false })
      .limit(PICKUP_COUNT + FEATURED_MAX + 2),
    // ★の取材記事は特集に使わないので、★の上限 + 1 件あれば必ず 1 件は残る
    published()
      .eq('article_type', 'long')
      .order('published_at', { ascending: false })
      .limit(FEATURED_MAX + 1),
    published()
      .eq('article_type', 'mini')
      .order('published_at', { ascending: false })
      .limit(1),
    // 本文 (content) まで全件取ると重いので、抽選用には id だけ。
    // inner join は SELECT と揃える (カテゴリ無しの記事が当選して 2 回目で消えないように)
    supabase
      .from('posts')
      .select('id, post_categories!inner(categories!inner(id))')
      .eq('is_published', true)
      .eq('event_ended', false),
  ])

  for (const [name, res] of [
    ['starred', starredRes],
    ['latest', latestRes],
    ['interview', longRes],
    ['user post', miniRes],
    ['random candidate', candidateRes],
  ] as const) {
    if (res.error) console.error(`Error fetching home ${name} posts:`, res.error)
  }

  const starred = (starredRes.data ?? []) as PostWithRelations[]
  const latest = (latestRes.data ?? []) as PostWithRelations[]
  const longPosts = (longRes.data ?? []) as PostWithRelations[]
  const miniPosts = (miniRes.data ?? []) as PostWithRelations[]
  const candidateIds = (candidateRes.data ?? []).map((p) => p.id as string)

  const used = new Set<string>()
  const unused = (posts: PostWithRelations[]) => posts.filter((p) => !used.has(p.id))

  // 1. ★は全部 Pick Up へ (他の枠より先に確保する)
  const starredIds = new Set(starred.map((p) => p.id))
  starred.forEach((p) => used.add(p.id))

  // 2. みんなの投稿 = 最新の投稿記事 (★でも出す)
  const report = miniPosts[0] ?? null
  if (report) used.add(report.id)

  // 3. 特集 = 取材記事の最新。無ければ新しい記事 (どちらも★と他の枠に出たものは除く)
  const feature =
    unused(longPosts).find((p) => !starredIds.has(p.id)) ?? unused(latest)[0] ?? null
  if (feature) used.add(feature.id)

  // 4. Pick Up の残りを新しい記事で埋める
  const fill = unused(latest).slice(0, Math.max(0, PICKUP_COUNT - starred.length))
  fill.forEach((p) => used.add(p.id))
  const pickup = [...starred, ...fill]

  const randomIds = shuffle(candidateIds.filter((id) => !used.has(id))).slice(0, RANDOM_COUNT)
  const randomPosts = await fetchPostsByIds(supabase, randomIds)

  return { feature, report, pickup, randomPosts }
}

/** 指定 id の記事を、渡した id の順 (= 抽選順) で返す */
async function fetchPostsByIds(
  supabase: ReturnType<typeof createClient>,
  ids: string[]
): Promise<PostWithRelations[]> {
  if (ids.length === 0) return []
  const { data, error } = await supabase.from('posts').select(SELECT).in('id', ids)
  if (error) {
    console.error('Error fetching home random posts:', error)
    return []
  }
  const byId = new Map((data as PostWithRelations[]).map((p) => [p.id, p]))
  return ids.flatMap((id) => byId.get(id) ?? [])
}

/** Fisher–Yates (元の配列は変えない) */
function shuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
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
