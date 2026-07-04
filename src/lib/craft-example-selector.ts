/**
 * お手本記事セレクタ（記事クラフト用）。
 *
 * チラシ/メモから抽出した「カテゴリ + キーワード」をもとに、
 * 既存の自由記事（＝紗代さん本人の原稿）から題材が近いものを 2〜3 本自動選択する。
 * 選んだ記事の本文をプレーンテキスト化して、執筆パスの few-shot「お手本」に使う。
 *
 * 方針:
 * - 埋め込みは使わず、同カテゴリ内の全自由記事を対象にキーワード重なりでスコアリング
 *   （記事本体には埋め込みが無く、article_knowledge の埋め込みは 96 中 27 件しかカバーしないため）。
 * - 対象は article_type='free' のみ（ミニ/ロングや AI 生成物をお手本にしない）。
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase'

export interface StyleExample {
  title: string
  /** プレーンテキスト化した本文（先頭のみ、上限あり） */
  text: string
}

const MAX_EXAMPLES = 3
const EXAMPLE_TEXT_MAX = 1800
const CANDIDATE_LIMIT = 40

interface Candidate {
  id: string
  title: string
  excerpt: string | null
  view_count: number | null
  is_featured: boolean
}

export async function selectStyleExamples(opts: {
  categorySlug: string
  keywords: string[]
  excludePostId?: string | null
}): Promise<StyleExample[]> {
  const { categorySlug, keywords, excludePostId } = opts
  const supabase = createAdminClient()

  // 1. 同カテゴリの自由記事を候補に。足りなければ全カテゴリで補完。
  let candidates = await fetchCandidates(supabase, { categorySlug, excludePostId })
  if (candidates.length < MAX_EXAMPLES) {
    const fill = await fetchCandidates(supabase, { excludePostId })
    const seen = new Set(candidates.map((c) => c.id))
    candidates = [...candidates, ...fill.filter((c) => !seen.has(c.id))]
  }
  if (candidates.length === 0) return []

  // 2. キーワード重なり（タイトル > 抜粋）+ おすすめ + 閲覧数でスコアリング
  const kws = keywords
    .map((k) => k.toLowerCase().trim())
    .filter((k) => k.length >= 2)

  const scored = candidates.map((c) => {
    const title = c.title.toLowerCase()
    const excerpt = (c.excerpt ?? '').toLowerCase()
    let score = 0
    for (const k of kws) {
      if (title.includes(k)) score += 3
      else if (excerpt.includes(k)) score += 1
    }
    if (c.is_featured) score += 0.5
    score += Math.min((c.view_count ?? 0) / 100, 0.4) // ごく弱いタイブレーク
    return { c, score }
  })
  scored.sort((a, b) => b.score - a.score)
  const top = scored.slice(0, MAX_EXAMPLES).map((s) => s.c)

  // 3. 選ばれた記事の本文を取得 → プレーンテキスト化
  const ids = top.map((t) => t.id)
  const { data: full } = await supabase
    .from('posts')
    .select('id, content')
    .in('id', ids)
  const contentById = new Map<string, string>(
    ((full ?? []) as Array<{ id: string; content: string | null }>).map((r) => [
      r.id,
      r.content ?? '',
    ])
  )

  return top.map((t) => ({
    title: t.title,
    text: htmlToPlain(contentById.get(t.id) ?? '').slice(0, EXAMPLE_TEXT_MAX),
  }))
}

async function fetchCandidates(
  supabase: SupabaseClient,
  opts: { categorySlug?: string; excludePostId?: string | null }
): Promise<Candidate[]> {
  let q = supabase
    .from('posts')
    .select(
      'id, title, excerpt, view_count, is_featured, post_categories!inner(categories!inner(slug))'
    )
    .eq('is_published', true)
    .eq('article_type', 'free')
    .order('view_count', { ascending: false })
    .limit(CANDIDATE_LIMIT)

  if (opts.categorySlug) {
    q = q.eq('post_categories.categories.slug', opts.categorySlug)
  }
  if (opts.excludePostId) {
    q = q.neq('id', opts.excludePostId)
  }

  const { data, error } = await q
  if (error) {
    console.warn('[craft-example-selector] fetchCandidates failed:', error.message)
    return []
  }
  return (
    (data ?? []) as Array<{
      id: string
      title: string
      excerpt: string | null
      view_count: number | null
      is_featured: boolean
    }>
  ).map((r) => ({
    id: r.id,
    title: r.title,
    excerpt: r.excerpt,
    view_count: r.view_count,
    is_featured: r.is_featured,
  }))
}

/** 記事 HTML を、見出し構造を残したプレーンテキストへ変換（お手本表示用） */
function htmlToPlain(html: string): string {
  return html
    .replace(/<figure[\s\S]*?<\/figure>/gi, '')
    .replace(/<img[^>]*>/gi, '')
    .replace(/<h[23][^>]*>/gi, '\n\n■ ')
    .replace(/<\/h[23]>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n・')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
