/**
 * 記事で紹介したお店・場所の今の状態 (閉店 / 移転)。Server / Client 両用・DB に触れない (テストあり)。
 *
 * - 閉店: 写真を白黒 + 「閉店されています」。トップ・関連記事・最近更新された記事には出さない (終了イベントと同じ)。
 *   記事ページの帯は紗代さんが書いた閉店のお知らせ文 (closure_note) を優先し、空なら決まり文
 * - 移転: 写真はカラーのまま小さな「移転されています」の札。記事ページには移転先の案内。どこにでも出す (今も行けるため)
 *
 * イベント終了 (event_ended) とは別の欄なので両方付くことがある。カードに重ねる案内は 1 つだけ
 * (閉店 > イベント終了 > 移転 の順。閉店はもう行けないので一番強い)。
 */

export type PlaceStatus = 'open' | 'closed' | 'relocated'

export const RELOCATION_NOTE_MAX = 100
/** 閉店のお知らせ文。写真の上の帯に出すので長くしすぎない */
export const CLOSURE_NOTE_MAX = 120

/** 閉店のお知らせ文が空のときに記事ページの帯に出す決まり文 */
export const DEFAULT_CLOSURE_NOTICE = 'こちらは閉店されています。記事は掲載当時の内容です。'

export function normalizePlaceStatus(value: unknown): PlaceStatus {
  return value === 'closed' || value === 'relocated' ? value : 'open'
}

/** 移転先のリンク。http/https 以外 (javascript: 等) や壊れた URL は捨てる */
export function normalizeRelocationUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  try {
    const url = new URL(trimmed)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

function normalizeNote(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().slice(0, max)
  return trimmed || null
}

export function normalizeRelocationNote(value: unknown): string | null {
  return normalizeNote(value, RELOCATION_NOTE_MAX)
}

export function normalizeClosureNote(value: unknown): string | null {
  return normalizeNote(value, CLOSURE_NOTE_MAX)
}

/** カードや記事の写真に重ねる案内 */
export type PhotoNotice = 'closed' | 'event_ended' | 'relocated'

export function photoNoticeOf(post: {
  event_ended?: boolean | null
  place_status?: string | null
}): PhotoNotice | null {
  if (post.place_status === 'closed') return 'closed'
  if (post.event_ended) return 'event_ended'
  if (post.place_status === 'relocated') return 'relocated'
  return null
}

/** 写真を白黒にする案内か (閉店・イベント終了。移転は今も行けるのでカラーのまま) */
export function isGrayscaleNotice(notice: PhotoNotice | null): boolean {
  return notice === 'closed' || notice === 'event_ended'
}

/**
 * 記事編集画面の「記事の今の状態」(プルダウン 1 つ)。DB は event_ended と place_status の 2 欄のまま、
 * 保存時に振り分ける (2026-11-24 紗代さん: 「イベント終了」のチェックと「お店の状態」が別々で分かりにくい)。
 * 写真に出る案内は 1 つだけなので、画面も 1 つ選ぶ形にした。
 * 「イベント終了 + 移転」のような組み合わせは選べない (写真は元々「終了」だけで、移転先の案内が出なくなるだけ)。
 */
export type ArticleStatus = 'open' | 'event_ended' | 'closed' | 'relocated'

export const ARTICLE_STATUS_OPTIONS: ReadonlyArray<{ value: ArticleStatus; label: string; hint: string }> = [
  { value: 'open', label: '通常', hint: 'ふだんどおり表示します。' },
  {
    value: 'event_ended',
    label: 'イベント終了',
    hint: 'サムネイルが白黒になり「このイベントは終了しています」と表示されます。トップページ・関連記事には出なくなります (記事は残ります)。イベントの開催回が過ぎたときに。',
  },
  {
    value: 'closed',
    label: '閉店',
    hint: 'サムネイルが白黒になり「閉店されています」と表示されます。トップページ・関連記事には出なくなります (記事は残ります)。',
  },
  {
    value: 'relocated',
    label: '移転',
    hint: '写真はカラーのまま「移転されています」の印が付きます。記事ページには下の移転先が表示されます。トップページなどにもこれまでどおり出ます。',
  },
]

export function normalizeArticleStatus(value: unknown): ArticleStatus {
  return value === 'event_ended' || value === 'closed' || value === 'relocated' ? value : 'open'
}

/** 保存済みの 2 欄 → 画面の選択。写真の案内と同じ優先順 (閉店 > イベント終了 > 移転) */
export function articleStatusOf(post: {
  event_ended?: boolean | null
  place_status?: string | null
}): ArticleStatus {
  return photoNoticeOf(post) ?? 'open'
}

/** 画面の選択 → 保存する 2 欄 */
export function articleStatusColumns(status: ArticleStatus): {
  event_ended: boolean
  place_status: PlaceStatus
} {
  return {
    event_ended: status === 'event_ended',
    place_status: status === 'closed' || status === 'relocated' ? status : 'open',
  }
}
