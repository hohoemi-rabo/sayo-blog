import { createClient } from '@/lib/supabase'
import { PostWithRelations } from '@/lib/types'

/**
 * トップページに並べる記事をまとめて決める (Ticket 44)。
 *
 * - feature (特集): おすすめ (is_featured) の最新 1 件。無ければ最新記事
 * - report (レポート): 特集に出ていない最新記事 1 件
 * - pickup (Pick Up): 上の 2 枠に出ていない記事を、おすすめ → 最新の順で 6 件
 * - randomPosts (右枠): 上の 3 枠に出ていない記事からランダムに 3 件。
 *   終了イベント (event_ended) は除く。ISR なので並びは再生成 (1 時間) ごとに変わる
 *   (記事の保存・削除でもトップは作り直されるので、そのときも変わる)
 *
 * 同じ記事が複数の枠に出ないよう、決める順に「使用済み」を積んでいく。
 * ランダム枠は固定枠を決めてから選ぶ (先に選ぶと特集・レポート・Pick Up が抽選結果でずれる)。
 * そのため 1 回目は 3 本を並列 (ランダム候補は id だけ)、2 回目で当選した 3 件の本体を取る。
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
const PICKUP_COUNT = 6

export interface HomePosts {
  feature: PostWithRelations | null
  report: PostWithRelations | null
  randomPosts: PostWithRelations[]
  pickup: PostWithRelations[]
}

export async function getHomePosts(): Promise<HomePosts> {
  const supabase = createClient()

  const [featuredRes, latestRes, candidateRes] = await Promise.all([
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
      .limit(PICKUP_COUNT + 4),
    // 本文 (content) まで全件取ると重いので、抽選用には id だけ。
    // inner join は SELECT と揃える (カテゴリ無しの記事が当選して 2 回目で消えないように)
    supabase
      .from('posts')
      .select('id, post_categories!inner(categories!inner(id))')
      .eq('is_published', true)
      .eq('event_ended', false),
  ])

  for (const [name, res] of [['featured', featuredRes], ['latest', latestRes], ['random candidate', candidateRes]] as const) {
    if (res.error) console.error(`Error fetching home ${name} posts:`, res.error)
  }

  const featured = (featuredRes.data ?? []) as PostWithRelations[]
  const latest = (latestRes.data ?? []) as PostWithRelations[]
  const candidateIds = (candidateRes.data ?? []).map((p) => p.id as string)

  const used = new Set<string>()
  const take = (post: PostWithRelations | undefined) => {
    if (!post) return null
    used.add(post.id)
    return post
  }
  const unused = (posts: PostWithRelations[]) => posts.filter((p) => !used.has(p.id))

  const feature = take(featured[0] ?? latest[0])
  const report = take(unused(latest)[0])
  const pickup = dedupeById([...unused(featured), ...unused(latest)]).slice(0, PICKUP_COUNT)
  pickup.forEach((p) => used.add(p.id))

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
