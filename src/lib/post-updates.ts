/**
 * 記事の更新履歴 (Ticket 46)。純粋関数だけ (Server / Client / テストで共用)。
 *
 * 決まりごと:
 * - 履歴 1 行 = 日本時間の日付 (YYYY-MM-DD) + 何を更新したか (1 行, 100 字まで)
 * - 公開ページの「最終更新」= 履歴の最新日付。ただし初回掲載日より後のときだけ出す
 *   (誤字直しの保存では変わらない = posts.updated_at は使わない)
 * - dateModified・サイトマップの lastmod も同じ日付にそろえる (画面の日付と Google に伝える日付を食い違わせない)
 */

export const POST_UPDATE_NOTE_MAX = 100
/** 1 記事に残せる履歴の上限 (画面が長くなりすぎないように) */
export const POST_UPDATES_MAX = 50
/** 公開ページの更新履歴の見出しの id (帯の「更新履歴を見る」の飛び先) */
export const UPDATE_HISTORY_ANCHOR_ID = 'update-history'

export interface PostUpdateEntry {
  /** YYYY-MM-DD (日本時間) */
  updated_on: string
  note: string
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

/** YYYY-MM-DD として実在する日付か */
export function isValidDateString(value: string): boolean {
  const m = DATE_RE.exec(value)
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const date = new Date(Date.UTC(y, mo - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d
}

/** 日時 (ISO) → 日本時間の日付 YYYY-MM-DD */
export function toJstDateString(iso: string | Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(typeof iso === 'string' ? new Date(iso) : iso)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

/**
 * 日時 (ISO) → datetime-local 入力の値 (日本時間, YYYY-MM-DDTHH:mm)。
 * ブラウザ・サーバーのタイムゾーンに左右されない (SSR とブラウザで同じ値になる)
 */
export function toJstDatetimeLocal(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso))
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}

/** datetime-local 入力の値 (日本時間として読む) → ISO。toJstDatetimeLocal の逆 */
export function fromJstDatetimeLocal(value: string): string {
  return new Date(`${value}:00+09:00`).toISOString()
}

/** YYYY-MM-DD → 2026.5.12 */
export function formatDateStringDot(value: string): string {
  const m = DATE_RE.exec(value)
  if (!m) return value
  return `${Number(m[1])}.${Number(m[2])}.${Number(m[3])}`
}

/** 新しい日付が先。同じ日は元の並び (後から足した行が先に来るよう呼び出し側で並べる) */
export function sortUpdatesNewestFirst<T extends PostUpdateEntry>(updates: T[]): T[] {
  return [...updates].sort((a, b) => (a.updated_on < b.updated_on ? 1 : a.updated_on > b.updated_on ? -1 : 0))
}

/**
 * 管理画面から来た履歴を保存できる形にそろえる。
 * 空の行 (日付も内容も無い) は黙って捨て、半端な行・長すぎる行はエラーにする
 * (黙って捨てると「書いたのに出ない」になるため)。
 */
export function normalizeUpdateEntries(
  entries: PostUpdateEntry[]
): { ok: true; entries: PostUpdateEntry[] } | { ok: false; error: string } {
  const result: PostUpdateEntry[] = []
  for (const entry of entries) {
    const note = entry.note.replace(/\s+/g, ' ').trim()
    const date = entry.updated_on.trim()
    if (!note && !date) continue
    if (!note) return { ok: false, error: '更新履歴に、内容が空の行があります' }
    if (!isValidDateString(date)) return { ok: false, error: `更新履歴「${note}」の日付が正しくありません` }
    if (note.length > POST_UPDATE_NOTE_MAX) {
      return { ok: false, error: `更新履歴は 1 行 ${POST_UPDATE_NOTE_MAX} 文字までです (「${note.slice(0, 15)}…」)` }
    }
    result.push({ updated_on: date, note })
  }
  if (result.length > POST_UPDATES_MAX) {
    return { ok: false, error: `更新履歴は ${POST_UPDATES_MAX} 行までです` }
  }
  return { ok: true, entries: sortUpdatesNewestFirst(result) }
}

/**
 * 公開ページに出す「最終更新」の日付 (YYYY-MM-DD)。
 * 履歴が無い・初回掲載日以前の日付しか無いときは null (= 最終更新を出さない)。
 */
export function lastUpdatedOn(
  updates: Pick<PostUpdateEntry, 'updated_on'>[],
  publishedAt: string | null | undefined
): string | null {
  if (updates.length === 0) return null
  const latest = updates.reduce((max, u) => (u.updated_on > max ? u.updated_on : max), updates[0].updated_on)
  if (publishedAt && latest <= toJstDateString(publishedAt)) return null
  return latest
}

/**
 * dateModified / og:modified_time / サイトマップの lastmod に使う日時 (ISO)。
 * 最終更新があればその日 (日本時間 0 時)、無ければ公開日時、それも無ければ fallback。
 */
export function contentModifiedAt(
  updates: Pick<PostUpdateEntry, 'updated_on'>[],
  publishedAt: string | null | undefined,
  fallback: string
): string {
  const last = lastUpdatedOn(updates, publishedAt)
  if (last) return `${last}T00:00:00+09:00`
  return publishedAt || fallback
}

export interface RecentlyUpdatedRow {
  post_id: string
  updated_on: string
}

/**
 * 「最近更新された記事」に出す記事 id を新しい順に選ぶ (1 記事 1 回、excludeId は除く)。
 * rows は日付の新しい順に並んでいる前提。初回掲載日以前の日付の行は呼び出し側で除いておく
 */
export function pickRecentlyUpdatedPostIds(
  rows: RecentlyUpdatedRow[],
  excludeId: string | null,
  limit: number
): string[] {
  const ids: string[] = []
  for (const row of rows) {
    if (row.post_id === excludeId || ids.includes(row.post_id)) continue
    ids.push(row.post_id)
    if (ids.length >= limit) break
  }
  return ids
}
