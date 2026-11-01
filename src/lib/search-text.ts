/**
 * サイト内検索の文字処理 (純粋関数。Server / Client 両用)。
 *
 * 検索の判定は DB の `search_published_posts` (migration 20261101120000) が行う。
 * ここは「入力を語に分ける」「結果カードに該当箇所を抜き出して強調する」担当で、
 * 正規化の規則 (NFKC + 小文字) は DB 側の `lower(normalize(x, NFKC))` とそろえている。
 */

/** 一度に使う語の上限 (DB 側も先頭 5 語しか見ない) */
export const MAX_SEARCH_TERMS = 5
/** 1 語の長さの上限 (長すぎる入力で無駄な処理をしない) */
export const MAX_TERM_LENGTH = 50

/** 全角・半角と大文字・小文字をそろえる */
export function normalizeForSearch(text: string): string {
  return text.normalize('NFKC').toLowerCase()
}

/**
 * 入力を検索語に分ける。全角スペースも区切りになる (NFKC で半角になるため)。
 * 重複は除き、最大 MAX_SEARCH_TERMS 語。
 */
export function splitSearchTerms(query: string): string[] {
  const terms: string[] = []
  for (const raw of normalizeForSearch(query).split(/\s+/)) {
    const term = raw.slice(0, MAX_TERM_LENGTH)
    if (term && !terms.includes(term)) terms.push(term)
    if (terms.length >= MAX_SEARCH_TERMS) break
  }
  return terms
}

const ENTITIES: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  '#39': "'",
  '#x27': "'",
}

/** 記事本文 (Tiptap の HTML) を、表示用の素の文字列にする */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(nbsp|amp|lt|gt|quot|#39|#x27);/g, (_, name: string) => ENTITIES[name])
    .replace(/\s+/g, ' ')
    .trim()
}

export interface SnippetSegment {
  text: string
  /** 検索語に一致した部分か (強調表示する) */
  hit: boolean
}

/**
 * 元の文字列を 1 文字ずつ正規化し、正規化後の位置 → 元の位置の対応を持つ。
 * NFKC で文字数が変わる文字 (例: 「㈱」→「(株)」) があっても、元の文字列を正しく切り出すため。
 * ※ 半角カナ + 半角濁点 (ｶﾞ) のような 2 文字の合成は 1 文字ずつでは起きないので、
 *   その組み合わせだけは一致しないことがある (記事本文ではまず出ない)。
 */
function normalizeWithMap(text: string): { normalized: string; origin: number[] } {
  let normalized = ''
  const origin: number[] = []
  let i = 0
  for (const ch of text) {
    const n = normalizeForSearch(ch)
    for (let k = 0; k < n.length; k++) origin.push(i)
    normalized += n
    i += ch.length
  }
  origin.push(text.length)
  return { normalized, origin }
}

/**
 * 検索語が最初に出てくる箇所の前後を抜き出し、一致部分に印を付ける。
 * どの語も含まれていなければ null。
 *
 * @param before 一致箇所より前に残す文字数
 * @param after  一致箇所の先頭から後ろに残す文字数
 */
export function buildSnippet(
  text: string,
  terms: string[],
  { before = 30, after = 80 }: { before?: number; after?: number } = {}
): SnippetSegment[] | null {
  const usable = terms.map(normalizeForSearch).filter(Boolean)
  if (!text || usable.length === 0) return null

  const { normalized, origin } = normalizeWithMap(text)

  // 語の順に探し、最初に見つかった語の位置を抜き出しの中心にする (先に入力した語ほど大事)
  let anchor = -1
  for (const term of usable) {
    anchor = normalized.indexOf(term)
    if (anchor >= 0) break
  }
  if (anchor < 0) return null

  const startN = Math.max(0, anchor - before)
  const endN = Math.min(normalized.length, anchor + after)

  // 抜き出し範囲の中の一致箇所をすべて集めて、重なりはまとめる
  const ranges: Array<[number, number]> = []
  for (const term of usable) {
    let from = startN
    while (from < endN) {
      const at = normalized.indexOf(term, from)
      if (at < 0 || at >= endN) break
      ranges.push([at, Math.min(at + term.length, endN)])
      from = at + term.length
    }
  }
  ranges.sort((a, b) => a[0] - b[0])
  const merged: Array<[number, number]> = []
  for (const r of ranges) {
    const last = merged[merged.length - 1]
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1])
    else merged.push([r[0], r[1]])
  }

  const slice = (a: number, b: number) => text.slice(origin[a], origin[b])
  const segments: SnippetSegment[] = []
  const push = (s: string, hit: boolean) => {
    if (s) segments.push({ text: s, hit })
  }

  let cursor = startN
  for (const [a, b] of merged) {
    push(slice(cursor, a), false)
    push(slice(a, b), true)
    cursor = b
  }
  push(slice(cursor, endN), false)

  if (startN > 0) segments.unshift({ text: '…', hit: false })
  if (endN < normalized.length) segments.push({ text: '…', hit: false })
  return segments
}

/** LIKE / ILIKE のパターンに入れる前に % _ \ を無効化する */
export function escapeLikePattern(text: string): string {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`)
}
