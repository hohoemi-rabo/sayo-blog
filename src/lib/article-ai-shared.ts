/**
 * AI 記事生成の共通ヘルパー。
 *
 * もともと ig-article-generator.ts 内にあった純粋ヘルパー
 * (Gemini 呼び出し + リトライ / JSON パース + 検証 / イベント正規化 /
 *  カテゴリ解決 / ハッシュタグ紐付け) を切り出し、
 * Ticket 41 のミニ記事生成 (mini-article-generator.ts) と共有する。
 *
 * 出力 JSON スキーマは IG 記事生成と共通 (IgArticleAiOutput)。
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getGenerativeModel } from '@/lib/gemini'
import { sleep } from '@/lib/knowledge-generator'
import { slugifyTitle } from '@/lib/slug-utils'
import type { IgArticleAiOutput, IgArticleEventData } from '@/lib/types'

export const MAX_RETRIES = 3
export const INITIAL_BACKOFF_MS = 1000
export const FALLBACK_CATEGORY_SLUG = 'news'

/** 期待される入力不足など、呼び出し側に 400 として返すべきエラー */
export class ArticleAiValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ArticleAiValidationError'
  }
}

// ------------------------------------------------------------
// Gemini call + JSON parse
// ------------------------------------------------------------

/** プロンプトを Gemini に投げ、JSON をパース・検証して返す (3 回リトライ + 指数バックオフ) */
export async function callGeminiForArticle(
  prompt: string,
  logTag = 'article-ai'
): Promise<IgArticleAiOutput> {
  const model = getGenerativeModel()
  let lastError: unknown

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await model.generateContent(prompt)
      const text = result.response.text()
      return parseAndValidate(text)
    } catch (err) {
      lastError = err
      console.warn(
        `[${logTag}] Gemini attempt ${attempt}/${MAX_RETRIES} failed:`,
        err instanceof Error ? err.message : err
      )
      if (attempt < MAX_RETRIES) {
        await sleep(INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1))
      }
    }
  }

  throw new Error(
    `AI 記事生成に失敗しました (${MAX_RETRIES} 回試行): ${
      lastError instanceof Error ? lastError.message : 'unknown'
    }`
  )
}

export function parseAndValidate(raw: string): IgArticleAiOutput {
  let jsonStr = raw.trim()
  // Strip markdown fences if Gemini included them despite instructions.
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch (err) {
    throw new Error(
      `JSON パースに失敗しました: ${err instanceof Error ? err.message : 'unknown'}`
    )
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI 出力がオブジェクトではありません')
  }
  const o = parsed as Record<string, unknown>

  const title = strField(o.title)
  const excerpt = strField(o.excerpt)
  const contentHtml = strField(o.content_html)
  const recommendedCategorySlug = strField(o.recommended_category_slug)
  const recommendedHashtags = Array.isArray(o.recommended_hashtags)
    ? o.recommended_hashtags
        .map((t) => (typeof t === 'string' ? t.trim() : ''))
        .filter((t) => t.length > 0)
    : []

  if (!title) throw new Error('AI 出力に title がありません')
  if (!contentHtml) throw new Error('AI 出力に content_html がありません')

  const event = parseEvent(o.event)

  return {
    title,
    excerpt,
    content_html: contentHtml,
    recommended_category_slug: recommendedCategorySlug || FALLBACK_CATEGORY_SLUG,
    recommended_hashtags: recommendedHashtags,
    event,
  }
}

export function parseEvent(raw: unknown): IgArticleEventData {
  const empty: IgArticleEventData = {
    is_event: false,
    event_date_start: null,
    event_date_end: null,
    event_time_start: null,
    event_time_end: null,
    event_venue: null,
    event_address: null,
    event_fee: null,
    event_url: null,
    extraction_note: null,
  }

  if (!raw || typeof raw !== 'object') return empty
  const e = raw as Record<string, unknown>
  const isEvent = e.is_event === true

  return {
    is_event: isEvent,
    event_date_start: isEvent ? normalizeDate(e.event_date_start) : null,
    event_date_end: isEvent ? normalizeDate(e.event_date_end) : null,
    event_time_start: isEvent ? nullableStr(e.event_time_start) : null,
    event_time_end: isEvent ? nullableStr(e.event_time_end) : null,
    event_venue: isEvent ? nullableStr(e.event_venue) : null,
    event_address: isEvent ? nullableStr(e.event_address) : null,
    event_fee: isEvent ? nullableStr(e.event_fee) : null,
    event_url: isEvent ? nullableStr(e.event_url) : null,
    extraction_note: nullableStr(e.extraction_note),
  }
}

function strField(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

function nullableStr(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t.length > 0 ? t : null
}

function normalizeDate(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  // Accept only ISO YYYY-MM-DD; anything else (e.g. "来月") -> null.
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null
}

// ------------------------------------------------------------
// Categories
// ------------------------------------------------------------

export async function fetchCategories(
  supabase: SupabaseClient
): Promise<Array<{ id: string; slug: string; name: string }>> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, slug, name')
    .order('order_num', { ascending: true })
  if (error) throw new Error(`カテゴリ取得に失敗しました: ${error.message}`)
  return (data ?? []) as Array<{ id: string; slug: string; name: string }>
}

export function resolveCategoryId(
  categories: Array<{ id: string; slug: string }>,
  recommendedSlug: string,
  fallbackSlug: string | null = null
): string {
  const norm = (s?: string | null) => (s ?? '').toLowerCase().trim()
  const find = (slug: string) =>
    categories.find((c) => c.slug.toLowerCase() === norm(slug))?.id ?? null

  return (
    find(recommendedSlug) ||
    (fallbackSlug ? find(fallbackSlug) : null) ||
    find(FALLBACK_CATEGORY_SLUG) ||
    categories[0].id
  )
}

// ------------------------------------------------------------
// Hashtags
// ------------------------------------------------------------

/** 推奨ハッシュタグを hashtags / post_hashtags に紐付ける (新規は INSERT、競合は再取得) */
export async function linkHashtags(
  supabase: SupabaseClient,
  postId: string,
  rawNames: string[]
): Promise<void> {
  const uniqueNames = Array.from(
    new Set(
      rawNames
        .map((n) => n.replace(/^#+/, '').trim())
        .filter((n) => n.length > 0 && n.length <= 50)
    )
  )
  if (uniqueNames.length === 0) return

  const { data: existing } = await supabase
    .from('hashtags')
    .select('id, name')
    .in('name', uniqueNames)

  const existingMap = new Map<string, string>(
    ((existing ?? []) as Array<{ id: string; name: string }>).map((h) => [
      h.name,
      h.id,
    ])
  )

  const toInsert = uniqueNames
    .filter((n) => !existingMap.has(n))
    .map((n) => ({ name: n, slug: slugifyTitle(n), count: 0 }))

  if (toInsert.length > 0) {
    const { data: inserted, error } = await supabase
      .from('hashtags')
      .insert(toInsert)
      .select('id, name')
    if (error) {
      // Race against a concurrent insert (UNIQUE on name) — re-fetch the rows.
      const { data: retry } = await supabase
        .from('hashtags')
        .select('id, name')
        .in(
          'name',
          toInsert.map((t) => t.name)
        )
      ;((retry ?? []) as Array<{ id: string; name: string }>).forEach((h) =>
        existingMap.set(h.name, h.id)
      )
    } else if (inserted) {
      ;(inserted as Array<{ id: string; name: string }>).forEach((h) =>
        existingMap.set(h.name, h.id)
      )
    }
  }

  const links = uniqueNames
    .map((n) => existingMap.get(n))
    .filter((id): id is string => !!id)
    .map((hashtagId) => ({ post_id: postId, hashtag_id: hashtagId }))

  if (links.length === 0) return
  const { error: linkErr } = await supabase
    .from('post_hashtags')
    .insert(links)
  if (linkErr) {
    console.error('[article-ai-shared] post_hashtags insert failed:', linkErr)
  }
}
