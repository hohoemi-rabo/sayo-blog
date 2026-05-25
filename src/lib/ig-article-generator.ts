/**
 * AI 記事再構成 (Ticket 37) — generate a blog post draft from a Cowork-imported
 * Instagram post using Gemini, including structured event metadata extraction.
 *
 * ⚠️ 【不使用 / DEPRECATED】(Ticket 41)
 * IG 取り込みフロー (Ticket 40 で sources/imports を廃止) のエントリポイントが
 * 削除されたため、generateArticleFromIg はどこからも呼ばれていない。
 * 純粋ヘルパー (Gemini 呼び出し / JSON 検証 / イベント正規化 / カテゴリ・タグ紐付け) は
 * `src/lib/article-ai-shared.ts` に集約され、ミニ記事生成 (mini-article-generator.ts) が利用する。
 * 本ファイルは参考用に残置。再び IG→ブログ取り込みが必要になったら article-ai-shared を再利用すること。
 */

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase'
import { assertAdminAuth } from '@/lib/admin-auth'
import { getGenerativeModel } from '@/lib/gemini'
import { sleep } from '@/lib/knowledge-generator'
import { buildArticleFromIgPrompt } from '@/lib/ig-article-prompt'
import { ensureCreditSection } from '@/lib/ig-article-credit'
import { injectImagesIntoArticle } from '@/lib/ig-article-images'
import { generateUniquePostSlug, slugifyTitle } from '@/lib/slug-utils'
import type { IgArticleAiOutput, IgArticleEventData } from '@/lib/types'

const MAX_RETRIES = 3
const INITIAL_BACKOFF_MS = 1000
const FALLBACK_CATEGORY_SLUG = 'news'

// Validation errors are surfaced to the API caller as 400; other errors are 500.
export class IgArticleValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'IgArticleValidationError'
  }
}

interface ImportedRow {
  id: string
  source_id: string
  ig_post_id: string
  caption: string | null
  ig_posted_at: string | null
  ig_post_url: string | null
  status: string
  generated_post_id: string | null
  stored_image_urls: string[] | null
  selected_image_indexes: number[] | null
}

interface SourceRow {
  ig_username: string
  display_name: string
  category_slug: string | null
}

export interface GenerateArticleResult {
  post_id: string
  is_event: boolean
}

export async function generateArticleFromIg(
  importedId: string
): Promise<GenerateArticleResult> {
  await assertAdminAuth()
  const supabase = createAdminClient()

  // 1. Load imported post + source.
  const { imp, source } = await loadImported(supabase, importedId)

  // 2. Guard: only pending or processing rows are eligible.
  if (imp.status !== 'pending' && imp.status !== 'processing') {
    throw new IgArticleValidationError(
      `この投稿は既に処理されています (status=${imp.status})`
    )
  }
  if (imp.generated_post_id) {
    throw new IgArticleValidationError(
      'この投稿からは既に記事が生成されています'
    )
  }

  // 3. Mark as processing (idempotent — Ticket 36 startGenerateArticle also does this).
  if (imp.status !== 'processing') {
    await supabase
      .from('ig_imported_posts')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', importedId)
  }

  try {
    // 4. Resolve adopted images from selected_image_indexes.
    const allImages = imp.stored_image_urls ?? []
    const indexes =
      imp.selected_image_indexes && imp.selected_image_indexes.length > 0
        ? imp.selected_image_indexes
        : allImages.map((_, i) => i)
    const articleImageUrls = indexes
      .map((i) => allImages[i])
      .filter((u): u is string => typeof u === 'string' && u.length > 0)

    if (articleImageUrls.length === 0) {
      throw new IgArticleValidationError(
        '採用画像を 1 枚以上選択してください'
      )
    }
    if (!imp.caption || imp.caption.trim().length === 0) {
      throw new IgArticleValidationError(
        '記事化に十分な情報がありません（キャプションが空です）'
      )
    }

    // 5. Fetch existing categories for AI to pick from.
    const categories = await fetchCategories(supabase)
    if (categories.length === 0) {
      throw new Error('カテゴリが 1 件も登録されていません')
    }

    // 6. Build prompt + call Gemini.
    const prompt = buildArticleFromIgPrompt({
      displayName: source.display_name,
      igUsername: source.ig_username,
      caption: imp.caption,
      igPostedAt: imp.ig_posted_at ?? '',
      igPostUrl: imp.ig_post_url ?? '',
      imageCount: articleImageUrls.length,
      categories: categories.map((c) => ({ slug: c.slug, name: c.name })),
    })

    const ai = await callGeminiForArticle(prompt)

    // 7. Resolve recommended category id (fallback to news).
    const categoryId = resolveCategoryId(
      categories,
      ai.recommended_category_slug,
      source.category_slug
    )

    // 8. Build content_html: ensure credit + inject adopted images.
    let contentHtml = ai.content_html.trim()
    contentHtml = ensureCreditSection(contentHtml, source, {
      ig_post_url: imp.ig_post_url,
    })
    contentHtml = injectImagesIntoArticle(contentHtml, articleImageUrls)

    // 9. Slug — prefer event-{date} prefix when applicable.
    const slug = await generateUniquePostSlug(supabase, ai.title, {
      eventDate: ai.event.is_event ? ai.event.event_date_start : null,
    })

    if (ai.event.extraction_note) {
      console.warn(
        `[ig-article-generator] extraction_note for ${importedId}:`,
        ai.event.extraction_note
      )
    }

    // 10. INSERT post (always draft).
    const { data: postRow, error: postErr } = await supabase
      .from('posts')
      .insert({
        title: ai.title,
        slug,
        content: contentHtml,
        excerpt: ai.excerpt,
        thumbnail_url: articleImageUrls[0] ?? null,
        published_at: null,
        is_published: false,
        is_featured: false,
        view_count: 0,
        is_event: ai.event.is_event,
        event_date_start: ai.event.event_date_start,
        event_date_end: ai.event.event_date_end,
        event_time_start: ai.event.event_time_start,
        event_time_end: ai.event.event_time_end,
        event_venue: ai.event.event_venue,
        event_address: ai.event.event_address,
        event_fee: ai.event.event_fee,
        event_url: ai.event.event_url,
      })
      .select('id')
      .single()

    if (postErr || !postRow) {
      throw new Error(
        `記事の保存に失敗しました: ${postErr?.message ?? 'unknown'}`
      )
    }

    const postId = postRow.id as string

    // 11. Link category.
    await supabase
      .from('post_categories')
      .insert({ post_id: postId, category_id: categoryId })

    // 12. Link hashtags (existing match by name → INSERT new ones for unknowns).
    await linkHashtags(supabase, postId, ai.recommended_hashtags)

    // 13. Mark imported as published + record generated_post_id.
    await supabase
      .from('ig_imported_posts')
      .update({
        status: 'published',
        generated_post_id: postId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', importedId)

    revalidatePath('/admin/instagram/imports')
    revalidatePath('/admin/posts')

    return { post_id: postId, is_event: ai.event.is_event }
  } catch (err) {
    // Roll back: status pending so the user can retry.
    await rollbackToPending(supabase, importedId)
    throw err
  }
}

/** Reset an import row's status to pending. Best-effort. */
export async function rollbackToPending(
  supabase: SupabaseClient,
  importedId: string
): Promise<void> {
  const { error } = await supabase
    .from('ig_imported_posts')
    .update({ status: 'pending', updated_at: new Date().toISOString() })
    .eq('id', importedId)
  if (error) {
    console.error('[ig-article-generator] rollbackToPending failed:', error)
  }
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

async function loadImported(
  supabase: SupabaseClient,
  importedId: string
): Promise<{ imp: ImportedRow; source: SourceRow }> {
  const { data, error } = await supabase
    .from('ig_imported_posts')
    .select(
      `
      id, source_id, ig_post_id, caption, ig_posted_at, ig_post_url,
      status, generated_post_id, stored_image_urls, selected_image_indexes,
      source:ig_sources(ig_username, display_name, category_slug)
      `
    )
    .eq('id', importedId)
    .maybeSingle()

  if (error) {
    throw new Error(`取り込み投稿の取得に失敗しました: ${error.message}`)
  }
  if (!data) {
    throw new IgArticleValidationError('取り込み投稿が見つかりません')
  }

  const rawSource = (data as { source?: unknown }).source
  const source = Array.isArray(rawSource) ? rawSource[0] : rawSource
  if (!source || typeof source !== 'object') {
    throw new Error('取り込み投稿に紐づくアカウント情報が見つかりません')
  }

  return {
    imp: data as ImportedRow,
    source: source as SourceRow,
  }
}

async function fetchCategories(
  supabase: SupabaseClient
): Promise<Array<{ id: string; slug: string; name: string }>> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, slug, name')
    .order('order_num', { ascending: true })
  if (error) throw new Error(`カテゴリ取得に失敗しました: ${error.message}`)
  return (data ?? []) as Array<{ id: string; slug: string; name: string }>
}

function resolveCategoryId(
  categories: Array<{ id: string; slug: string }>,
  recommendedSlug: string,
  sourceCategorySlug: string | null
): string {
  const norm = (s?: string | null) => (s ?? '').toLowerCase().trim()
  const find = (slug: string) =>
    categories.find((c) => c.slug.toLowerCase() === norm(slug))?.id ?? null

  return (
    find(recommendedSlug) ||
    (sourceCategorySlug ? find(sourceCategorySlug) : null) ||
    find(FALLBACK_CATEGORY_SLUG) ||
    categories[0].id
  )
}

async function linkHashtags(
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

  // Existing tags by name.
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

  // Tags to insert.
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
    console.error('[ig-article-generator] post_hashtags insert failed:', linkErr)
  }
}

// ------------------------------------------------------------
// Gemini call + JSON parse
// ------------------------------------------------------------

async function callGeminiForArticle(prompt: string): Promise<IgArticleAiOutput> {
  const model = getGenerativeModel()
  let lastError: unknown

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await model.generateContent(prompt)
      const text = result.response.text()
      const parsed = parseAndValidate(text)
      return parsed
    } catch (err) {
      lastError = err
      console.warn(
        `[ig-article-generator] Gemini attempt ${attempt}/${MAX_RETRIES} failed:`,
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

function parseAndValidate(raw: string): IgArticleAiOutput {
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

function parseEvent(raw: unknown): IgArticleEventData {
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
