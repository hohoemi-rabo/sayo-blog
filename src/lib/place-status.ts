/**
 * 記事で紹介したお店・場所の今の状態 (閉店 / 移転)。Server / Client 両用・DB に触れない (テストあり)。
 *
 * - 閉店: 写真を白黒 + 「閉店されています」。トップ・関連記事・最近更新された記事には出さない (終了イベントと同じ)
 * - 移転: 写真はカラーのまま小さな「移転されています」の札。記事ページには移転先の案内。どこにでも出す (今も行けるため)
 *
 * イベント終了 (event_ended) とは別の欄なので両方付くことがある。カードに重ねる案内は 1 つだけ
 * (閉店 > イベント終了 > 移転 の順。閉店はもう行けないので一番強い)。
 */

export type PlaceStatus = 'open' | 'closed' | 'relocated'

export const PLACE_STATUS_OPTIONS: ReadonlyArray<{ value: PlaceStatus; label: string }> = [
  { value: 'open', label: '通常' },
  { value: 'closed', label: '閉店' },
  { value: 'relocated', label: '移転' },
]

export const RELOCATION_NOTE_MAX = 100

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

export function normalizeRelocationNote(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().slice(0, RELOCATION_NOTE_MAX)
  return trimmed || null
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
