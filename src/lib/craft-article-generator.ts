/**
 * 記事クラフト生成（チラシ/メモ→記事）。
 *
 * フロー:
 * 1. 抽出パス（vision）: チラシ画像/PDF + メモを忠実に読み取り、カテゴリ・キーワード・整理済みの事実へ。
 * 2. お手本選定: 題材が近い自由記事を全 96 件から 2〜3 本自動選択。
 * 3. 執筆パス: 文体プロファイル + お手本 + 事実で、FUNE の語り口の通常記事（h2 構造）を生成。
 * 4. 下書き保存: posts（article_type='free', is_published=false）へ INSERT → 編集画面へ。
 *
 * 写真の自動配置は行わない（次フェーズ）。生成本文は img を含まず、編集画面で人が挿入する。
 * 既存のミニ記事生成（mini-article-generator.ts）と同じ保存パターンを踏襲。
 */

import { revalidatePath } from 'next/cache'
import type { Part } from '@google/generative-ai'
import { createAdminClient } from '@/lib/supabase'
import { generateUniquePostSlug } from '@/lib/slug-utils'
import { getWritingStyleProfile } from '@/lib/writing-style'
import { selectStyleExamples } from '@/lib/craft-example-selector'
import { syncPostImages } from '@/lib/post-images-sync'
import {
  buildCraftArticlePrompt,
  buildCraftExtractPrompt,
  parseCraftExtraction,
} from '@/lib/craft-article-prompt'
import {
  ArticleAiValidationError,
  callGeminiForArticle,
  callGeminiParsed,
  fetchCategories,
  linkHashtags,
  resolveCategoryId,
} from '@/lib/article-ai-shared'

export interface CraftImageInput {
  /** base64 エンコードした画像/PDF のデータ（データURI プレフィックスなし） */
  base64: string
  mimeType: string
}

export interface GenerateCraftArticleInput {
  /** チラシ画像/PDF（読み取り専用。記事本文には載せない） */
  images: CraftImageInput[]
  /** メモ（入力テキスト。補足指示・追加情報にも使う） */
  memoText: string
}

export interface GenerateCraftArticleResult {
  post_id: string
  is_event: boolean
}

export async function generateCraftArticle(
  input: GenerateCraftArticleInput
): Promise<GenerateCraftArticleResult> {
  const memoText = (input.memoText ?? '').trim()
  const images = input.images ?? []
  if (images.length === 0 && memoText.length === 0) {
    throw new ArticleAiValidationError(
      'チラシ画像またはメモのいずれかを入力してください'
    )
  }

  const supabase = createAdminClient()

  const categories = await fetchCategories(supabase)
  if (categories.length === 0) {
    throw new Error('カテゴリが 1 件も登録されていません')
  }
  const categoryList = categories.map((c) => ({ slug: c.slug, name: c.name }))

  // 1. 抽出パス（vision）: 素材を忠実に読み取って整理
  const extractPrompt = buildCraftExtractPrompt({
    categories: categoryList,
    memoText,
    hasImages: images.length > 0,
  })
  const extractParts: Array<string | Part> = [
    extractPrompt,
    ...images.map(
      (im): Part => ({
        inlineData: { data: im.base64, mimeType: im.mimeType },
      })
    ),
  ]
  const extraction = await callGeminiParsed(
    extractParts,
    parseCraftExtraction,
    'craft-extract'
  )

  // 2. お手本選定: 題材が近い自由記事を全記事から
  const examples = await selectStyleExamples({
    categorySlug: extraction.category_slug,
    keywords: extraction.keywords,
  })

  // 3. 執筆パス: 文体プロファイル + お手本 + 事実 で通常記事を生成
  const styleProfile = getWritingStyleProfile()
  const writePrompt = buildCraftArticlePrompt({
    styleProfile,
    examples,
    extraction,
    memoText,
    categories: categoryList,
  })
  const ai = await callGeminiForArticle(writePrompt, 'craft-article')

  // 4. 保存（下書き / 自由記事）
  const categoryId = resolveCategoryId(
    categories,
    ai.recommended_category_slug,
    extraction.category_slug
  )
  const contentHtml = ai.content_html.trim()
  const slug = await generateUniquePostSlug(supabase, ai.title, {
    eventDate: ai.event.is_event ? ai.event.event_date_start : null,
  })

  if (ai.event.extraction_note) {
    console.warn(
      '[craft-article-generator] extraction_note:',
      ai.event.extraction_note
    )
  }

  const { data: postRow, error: postErr } = await supabase
    .from('posts')
    .insert({
      title: ai.title,
      slug,
      content: contentHtml,
      excerpt: ai.excerpt,
      thumbnail_url: null,
      published_at: null,
      is_published: false,
      is_featured: false,
      view_count: 0,
      article_type: 'free',
      source_urls: null,
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

  await supabase
    .from('post_categories')
    .insert({ post_id: postId, category_id: categoryId })
  await linkHashtags(supabase, postId, ai.recommended_hashtags)

  // 生成本文に画像は無いが、経路を揃えるため同期しておく（サムネ後付けにも追従できる）
  await syncPostImages(postId)

  revalidatePath('/admin/posts')

  return { post_id: postId, is_event: ai.event.is_event }
}
