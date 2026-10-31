/**
 * 記事ページ下部の「関連記事」の選び方 (Ticket 45)。DB に触れない純粋関数 = node --test でテストする。
 *
 * 1. 紗代さんが手動で選んだ記事 (最大 3 件, 選んだ順)。ただし非公開・終了イベントになったものは外す
 *    (選択は DB に残したまま、表示のときだけ外す。公開に戻れば また出る)
 * 2. 空いた枠は同じカテゴリの公開記事から自動で選ぶ。共通ハッシュタグが多い順 → 同点は新しい順
 *    (ハッシュタグは 1 記事平均 1 個ほどで同点が多いので、同点の並びを DB 任せにしない)
 * 3. それでも足りなければ、ほかのカテゴリも含めた新しい記事で埋める
 *
 * どの段階でも 自分自身・終了イベント・非公開 は出さない。
 */

export const RELATED_POSTS_COUNT = 3

/** 手動選択 1 件。posts の RLS で非公開記事が見えないときは null 相当として渡さなくてよい */
export interface ManualRelatedPick {
  id: string
  isPublished: boolean
  eventEnded: boolean
}

export interface RelatedCandidate {
  id: string
  publishedAt: string | null
  hashtagSlugs: string[]
  isPublished: boolean
  eventEnded: boolean
}

export interface SelectRelatedInput {
  postId: string
  hashtagSlugs: string[]
  /** position 順 */
  manual: ManualRelatedPick[]
  /** 同じカテゴリの記事 (並び順は問わない) */
  sameCategory: RelatedCandidate[]
  /** 足りないときの補完用 (並び順は問わない。新しい順に並べ直す) */
  fallback: RelatedCandidate[]
  limit?: number
}

function isShowable(p: { isPublished: boolean; eventEnded: boolean }): boolean {
  return p.isPublished && !p.eventEnded
}

function time(publishedAt: string | null): number {
  if (!publishedAt) return -Infinity
  const t = Date.parse(publishedAt)
  return Number.isNaN(t) ? -Infinity : t
}

/** 新しい順。同時刻は id で並べて毎回同じ結果にする */
function compareNewest(a: RelatedCandidate, b: RelatedCandidate): number {
  const ta = time(a.publishedAt)
  const tb = time(b.publishedAt)
  // 公開日が両方無い (-Infinity 同士) と引き算が NaN になるので比較で並べる
  if (ta !== tb) return tb > ta ? 1 : -1
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

/** 表示する関連記事の id を表示順で返す (最大 limit 件) */
export function selectRelatedPostIds(input: SelectRelatedInput): string[] {
  const limit = input.limit ?? RELATED_POSTS_COUNT
  const picked: string[] = []
  // 手動で選んだ記事は、外れた (非公開・終了) ものも自動選定には出さない
  const excluded = new Set<string>([input.postId, ...input.manual.map((m) => m.id)])

  for (const m of input.manual) {
    if (picked.length >= limit) break
    if (m.id === input.postId || picked.includes(m.id)) continue
    if (isShowable(m)) picked.push(m.id)
  }

  const take = (candidates: RelatedCandidate[]) => {
    for (const c of candidates) {
      if (picked.length >= limit) return
      if (excluded.has(c.id) || !isShowable(c)) continue
      picked.push(c.id)
      excluded.add(c.id)
    }
  }

  const ownTags = new Set(input.hashtagSlugs)
  const commonTags = (c: RelatedCandidate) =>
    new Set(c.hashtagSlugs.filter((s) => ownTags.has(s))).size

  take(
    [...input.sameCategory].sort(
      (a, b) => commonTags(b) - commonTags(a) || compareNewest(a, b)
    )
  )
  take([...input.fallback].sort(compareNewest))

  return picked
}

/** 管理画面の関連記事検索の候補 1 件 (並べ替えに使う情報だけ) */
export interface RelatedOptionRankInput {
  id: string
  publishedAt: string | null
  categoryIds: string[]
  hashtagIds: string[]
  isPublished: boolean
  eventEnded: boolean
}

/**
 * 記事編集画面で関連記事を選ぶときの候補の並び (公開側の自動選定と同じ考え方)。
 * 公開ページに出る記事 → 同じカテゴリ → 共通ハッシュタグが多い → 新しい の順。
 * 下書き・終了イベントは選んでも表示されないので最後に回す (選べはする)。
 * categoryId / hashtagIds は保存前の編集中の値を渡す。
 */
export function rankRelatedOptions<T extends RelatedOptionRankInput>(
  options: T[],
  current: { categoryId: string | null; hashtagIds: string[] }
): T[] {
  const ownTags = new Set(current.hashtagIds)
  const key = (o: T) => ({
    showable: isShowable(o) ? 1 : 0,
    sameCategory: current.categoryId && o.categoryIds.includes(current.categoryId) ? 1 : 0,
    commonTags: new Set(o.hashtagIds.filter((h) => ownTags.has(h))).size,
    time: time(o.publishedAt),
  })
  return options
    .map((o) => ({ o, k: key(o) }))
    .sort(
      (a, b) =>
        b.k.showable - a.k.showable ||
        b.k.sameCategory - a.k.sameCategory ||
        b.k.commonTags - a.k.commonTags ||
        (a.k.time !== b.k.time ? (b.k.time > a.k.time ? 1 : -1) : 0) ||
        (a.o.id < b.o.id ? -1 : a.o.id > b.o.id ? 1 : 0)
    )
    .map(({ o }) => o)
}
