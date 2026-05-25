/**
 * ミニ記事生成 (Ticket 41).
 *
 * 情報窓口フォーム (mini_inquiries) に紗代さんが貼り付けた SNS 本文 + 添付画像から
 * Gemini で記事の下書き (posts, is_published=false) を生成する。
 *
 * 既存 IG 記事生成 (Ticket 37) の純粋ヘルパーを article-ai-shared.ts 経由で再利用。
 * 主な違い: 入力ソースが複数の自由テキスト / クレジット非表示 / h2 を使わない短文。
 */

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase'
import { generateUniquePostSlug } from '@/lib/slug-utils'
import { buildMiniArticlePrompt } from '@/lib/mini-article-prompt'
import {
  ArticleAiValidationError,
  callGeminiForArticle,
  fetchCategories,
  linkHashtags,
  resolveCategoryId,
} from '@/lib/article-ai-shared'
import type { MiniInquiry } from '@/lib/types'

const ADMIN_INQUIRIES_PATH = '/admin/inquiries'

export interface GenerateMiniArticleInput {
  inquiryId: string
  /** 紗代さんが各 URL に貼り付けた本文 */
  snsTexts: Array<{ url: string; text: string }>
  /** 記事化画面で追加アップロードした画像の公開 URL */
  additionalImageUrls: string[]
}

export interface GenerateMiniArticleResult {
  post_id: string
  is_event: boolean
}

export async function generateMiniArticle(
  input: GenerateMiniArticleInput
): Promise<GenerateMiniArticleResult> {
  const supabase = createAdminClient()

  // 1. 依頼を取得 + ガード
  const { data, error: loadErr } = await supabase
    .from('mini_inquiries')
    .select('*')
    .eq('id', input.inquiryId)
    .maybeSingle()
  if (loadErr) throw new Error(`依頼の取得に失敗しました: ${loadErr.message}`)
  if (!data) throw new ArticleAiValidationError('依頼が見つかりません')
  const inquiry = data as MiniInquiry
  if (inquiry.status !== 'pending' && inquiry.status !== 'generating') {
    throw new ArticleAiValidationError(
      `この依頼は既に処理されています (status=${inquiry.status})`
    )
  }
  if (inquiry.generated_post_id) {
    throw new ArticleAiValidationError('この依頼からは既に記事が生成されています')
  }

  // 2. 記事化中に更新
  await supabase
    .from('mini_inquiries')
    .update({ status: 'generating' })
    .eq('id', input.inquiryId)

  try {
    // 3. 画像 (フォーム提供 + 追加) を結合
    const imageUrls = [...(inquiry.image_urls ?? []), ...input.additionalImageUrls]

    // 4. 貼り付けテキストが空でないか
    const snsTexts = input.snsTexts.filter((s) => s.text.trim().length > 0)
    if (snsTexts.length === 0) {
      throw new ArticleAiValidationError(
        'SNS 投稿の本文を 1 つ以上貼り付けてください'
      )
    }

    // 5. カテゴリ取得 + プロンプト構築 + Gemini
    const categories = await fetchCategories(supabase)
    if (categories.length === 0) {
      throw new Error('カテゴリが 1 件も登録されていません')
    }
    const prompt = buildMiniArticlePrompt({
      inquiryType: inquiry.inquiry_type,
      inquiryTypeOther: inquiry.inquiry_type_other,
      snsTexts,
      imageCount: imageUrls.length,
      categories: categories.map((c) => ({ slug: c.slug, name: c.name })),
      preferredPublishDate: inquiry.publish_target_date,
    })
    const ai = await callGeminiForArticle(prompt, 'mini-article-generator')

    // 6. カテゴリ解決
    const categoryId = resolveCategoryId(categories, ai.recommended_category_slug)

    // 7. 本文に画像を挿入 (h2 を使わないミニ記事向けの配置)
    const contentHtml = placeMiniImages(ai.content_html.trim(), imageUrls)

    // 8. slug 生成 (event なら event-{date}- プレフィックス)
    const slug = await generateUniquePostSlug(supabase, ai.title, {
      eventDate: ai.event.is_event ? ai.event.event_date_start : null,
    })

    if (ai.event.extraction_note) {
      console.warn(
        `[mini-article-generator] extraction_note for ${input.inquiryId}:`,
        ai.event.extraction_note
      )
    }

    // 9. posts INSERT (常に下書き / source_urls に元 URL を控える)
    const { data: postRow, error: postErr } = await supabase
      .from('posts')
      .insert({
        title: ai.title,
        slug,
        content: contentHtml,
        excerpt: ai.excerpt,
        thumbnail_url: imageUrls[0] ?? null,
        published_at: null,
        is_published: false,
        is_featured: false,
        view_count: 0,
        article_type: 'mini',
        source_urls: inquiry.sns_urls,
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
      throw new Error(`記事の保存に失敗しました: ${postErr?.message ?? 'unknown'}`)
    }
    const postId = postRow.id as string

    // 10. カテゴリ / ハッシュタグ紐付け
    await supabase
      .from('post_categories')
      .insert({ post_id: postId, category_id: categoryId })
    await linkHashtags(supabase, postId, ai.recommended_hashtags)

    // 11. 依頼を公開済みに + 生成記事を紐付け
    await supabase
      .from('mini_inquiries')
      .update({ status: 'published', generated_post_id: postId })
      .eq('id', input.inquiryId)

    revalidatePath(ADMIN_INQUIRIES_PATH)
    revalidatePath('/admin/posts')

    return { post_id: postId, is_event: ai.event.is_event }
  } catch (err) {
    await rollbackToPending(supabase, input.inquiryId)
    throw err
  }
}

/** 依頼ステータスを pending に戻す (ベストエフォート) */
async function rollbackToPending(
  supabase: SupabaseClient,
  inquiryId: string
): Promise<void> {
  const { error } = await supabase
    .from('mini_inquiries')
    .update({ status: 'pending' })
    .eq('id', inquiryId)
  if (error) {
    console.error('[mini-article-generator] rollbackToPending failed:', error)
  }
}

/**
 * ミニ記事は h2 を使わないため、injectImagesIntoArticle (h2 前提) は使わず簡易配置。
 * 先頭の段落の直後に 1 枚目、残りは本文末尾にまとめる。段落が無ければ全て先頭。
 */
function placeMiniImages(html: string, imageUrls: string[]): string {
  if (imageUrls.length === 0) return html
  const tags = imageUrls.map(buildImageTag)
  const [first, ...rest] = tags

  const firstParaEnd = html.search(/<\/p>/i)
  let result: string
  if (firstParaEnd === -1) {
    // 段落が無い → 全画像を先頭へ
    result = `${tags.join('\n')}\n${html}`
    return result
  }

  const insertAt = firstParaEnd + '</p>'.length
  result = `${html.slice(0, insertAt)}\n${first}\n${html.slice(insertAt)}`
  if (rest.length > 0) {
    result = `${result.trimEnd()}\n${rest.join('\n')}`
  }
  return result
}

function buildImageTag(url: string): string {
  const safe = url.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
  return `<img class="max-w-full h-auto rounded-lg" src="${safe}">`
}
