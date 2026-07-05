'use server'

import { createAdminClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { triggerIgAutoGenerate } from '@/lib/ig-auto-generator'
import { syncPostImages } from '@/lib/post-images-sync'
import { assertAdminAuth } from '@/lib/admin-auth'
import {
  generateSummaries,
  generateSingleSummary,
  type SummaryLevel,
  type Summaries,
} from '@/lib/summary-generator'
import type { ArticleType } from '@/lib/types'

export type PostFormData = {
  title: string
  slug: string
  content: string
  excerpt: string
  thumbnail_url: string | null
  category_id: string | null
  hashtag_ids: string[]
  published_at: string | null
  is_published: boolean
  event_ended: boolean
  // Event metadata (Ticket 37)
  is_event: boolean
  event_date_start: string | null
  event_date_end: string | null
  event_time_start: string | null
  event_time_end: string | null
  event_venue: string | null
  event_address: string | null
  event_fee: string | null
  event_url: string | null
  // 出自 (Ticket 41/42) — 未指定なら DB 既定の 'free'
  article_type?: ArticleType
  // AI 3段階要約 — 未生成は null
  summary_short?: string | null
  summary_medium?: string | null
  summary_long?: string | null
}

export interface CreatePostOptions {
  /** ロング記事依頼から作成する場合、紐付け先の inquiry id */
  linkLongInquiryId?: string
}

export async function createPost(
  data: PostFormData,
  options?: CreatePostOptions
) {
  const supabase = createAdminClient()

  // Insert post
  const { data: post, error: postError } = await supabase
    .from('posts')
    .insert({
      title: data.title,
      slug: data.slug,
      content: data.content,
      excerpt: data.excerpt,
      thumbnail_url: data.thumbnail_url,
      published_at: data.published_at,
      is_published: data.is_published,
      event_ended: data.event_ended,
      is_event: data.is_event,
      event_date_start: data.event_date_start,
      event_date_end: data.event_date_end,
      event_time_start: data.event_time_start,
      event_time_end: data.event_time_end,
      event_venue: data.event_venue,
      event_address: data.event_address,
      event_fee: data.event_fee,
      event_url: data.event_url,
      article_type: data.article_type ?? 'free',
      summary_short: data.summary_short ?? null,
      summary_medium: data.summary_medium ?? null,
      summary_long: data.summary_long ?? null,
      view_count: 0,
    })
    .select()
    .single()

  if (postError) {
    console.error('Post creation error:', postError)
    return { success: false, error: postError.message }
  }

  // Link category
  if (data.category_id) {
    const { error: catError } = await supabase
      .from('post_categories')
      .insert({
        post_id: post.id,
        category_id: data.category_id,
      })

    if (catError) {
      console.error('Category link error:', catError)
    }
  }

  // Link hashtags
  if (data.hashtag_ids.length > 0) {
    const hashtagLinks = data.hashtag_ids.map((hashtagId) => ({
      post_id: post.id,
      hashtag_id: hashtagId,
    }))

    const { error: tagError } = await supabase
      .from('post_hashtags')
      .insert(hashtagLinks)

    if (tagError) {
      console.error('Hashtag link error:', tagError)
    }
  }

  // ロング記事依頼から作成された場合、依頼レコードに紐付け + 公開ならステータスも更新
  if (options?.linkLongInquiryId && post?.id) {
    const inquiryPatch: Record<string, unknown> = {
      generated_post_id: post.id,
    }
    if (data.is_published) inquiryPatch.status = 'published'
    const { error: linkErr } = await supabase
      .from('long_inquiries')
      .update(inquiryPatch)
      .eq('id', options.linkLongInquiryId)
    if (linkErr) {
      console.error('Long inquiry link error:', linkErr)
    } else {
      revalidatePath('/admin/inquiries')
    }
  }

  // ギャラリー用に画像を同期 (本文 + サムネから抽出)
  if (post?.id) {
    await syncPostImages(post.id as string)
  }

  revalidatePath('/admin/posts')
  revalidatePath('/')
  revalidatePath('/gallery')

  if (data.is_published && post?.id) {
    const newPostId = post.id as string
    after(() => triggerIgAutoGenerate(newPostId))
  }

  return { success: true, post }
}

export async function updatePost(id: string, data: PostFormData) {
  const supabase = createAdminClient()

  // Capture the current is_published so we can detect a false -> true transition
  // and trigger IG auto-generation after the save succeeds.
  const { data: current } = await supabase
    .from('posts')
    .select('is_published')
    .eq('id', id)
    .maybeSingle()
  const wasPublished = current?.is_published === true

  // Update post
  const { error: postError } = await supabase
    .from('posts')
    .update({
      title: data.title,
      slug: data.slug,
      content: data.content,
      excerpt: data.excerpt,
      thumbnail_url: data.thumbnail_url,
      published_at: data.published_at,
      is_published: data.is_published,
      event_ended: data.event_ended,
      is_event: data.is_event,
      event_date_start: data.event_date_start,
      event_date_end: data.event_date_end,
      event_time_start: data.event_time_start,
      event_time_end: data.event_time_end,
      event_venue: data.event_venue,
      event_address: data.event_address,
      event_fee: data.event_fee,
      event_url: data.event_url,
      summary_short: data.summary_short ?? null,
      summary_medium: data.summary_medium ?? null,
      summary_long: data.summary_long ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (postError) {
    console.error('Post update error:', postError)
    return { success: false, error: postError.message }
  }

  // Update category - delete existing and insert new
  await supabase.from('post_categories').delete().eq('post_id', id)

  if (data.category_id) {
    await supabase.from('post_categories').insert({
      post_id: id,
      category_id: data.category_id,
    })
  }

  // Update hashtags - delete existing and insert new
  await supabase.from('post_hashtags').delete().eq('post_id', id)

  if (data.hashtag_ids.length > 0) {
    const hashtagLinks = data.hashtag_ids.map((hashtagId) => ({
      post_id: id,
      hashtag_id: hashtagId,
    }))
    await supabase.from('post_hashtags').insert(hashtagLinks)
  }

  // false → true で公開化したとき、紐づくロング依頼を 'published' に自動更新
  if (!wasPublished && data.is_published) {
    const { error: inqErr } = await supabase
      .from('long_inquiries')
      .update({ status: 'published' })
      .eq('generated_post_id', id)
    if (inqErr) {
      console.error('Long inquiry auto-publish error:', inqErr)
    } else {
      revalidatePath('/admin/inquiries')
    }
  }

  // ギャラリー用に画像を同期 (本文/サムネ更新・公開状態変更を反映)
  await syncPostImages(id)

  revalidatePath('/admin/posts')
  revalidatePath(`/admin/posts/${id}`)
  revalidatePath('/')
  revalidatePath('/gallery')

  if (!wasPublished && data.is_published) {
    after(() => triggerIgAutoGenerate(id))
  }

  return { success: true }
}

export async function deletePost(id: string) {
  const supabase = createAdminClient()

  // この記事が情報窓口の依頼から生成されたものか先に控える。
  // 記事削除で generated_post_id は FK (ON DELETE SET NULL) により自動で NULL になるため、
  // 紐づく依頼 ID をここで取得しておく。
  const { data: linkedInquiries } = await supabase
    .from('mini_inquiries')
    .select('id')
    .eq('generated_post_id', id)

  // Delete related data first (due to foreign key constraints)
  await supabase.from('post_categories').delete().eq('post_id', id)
  await supabase.from('post_hashtags').delete().eq('post_id', id)

  // Delete post
  const { error } = await supabase.from('posts').delete().eq('id', id)

  if (error) {
    console.error('Post delete error:', error)
    return { success: false, error: error.message }
  }

  // 記事が消えた依頼は再アクション可能なように pending へ戻す。
  // (画像は依頼の持ち物として inquiry-images に残し、再生成に使える。
  //  不要なら依頼ごと削除 → そのとき deleteMiniInquiry が画像も掃除する)
  if (linkedInquiries && linkedInquiries.length > 0) {
    await supabase
      .from('mini_inquiries')
      .update({ status: 'pending' })
      .in(
        'id',
        linkedInquiries.map((r) => r.id)
      )
    revalidatePath('/admin/inquiries')
  }

  revalidatePath('/admin/posts')
  revalidatePath('/')

  return { success: true }
}

export async function getPost(id: string) {
  const supabase = createAdminClient()

  const { data: post, error } = await supabase
    .from('posts')
    .select(`
      *,
      post_categories(
        categories(id, name, slug)
      ),
      post_hashtags(
        hashtags(id, name, slug)
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Post fetch error:', error)
    return null
  }

  return post
}

export async function getPosts(filter?: {
  category?: string
  status?: string
  articleType?: string
}) {
  const supabase = createAdminClient()

  let query = supabase
    .from('posts')
    .select(`
      id,
      title,
      slug,
      excerpt,
      thumbnail_url,
      is_published,
      is_featured,
      event_ended,
      article_type,
      published_at,
      view_count,
      created_at,
      post_categories(
        categories(id, name, slug)
      )
    `, { count: 'exact' })
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (filter?.status === 'published') {
    query = query.eq('is_published', true)
  } else if (filter?.status === 'draft') {
    query = query.eq('is_published', false)
  }

  if (filter?.articleType) {
    query = query.eq('article_type', filter.articleType)
  }

  const { data: posts, error, count } = await query

  if (error) {
    console.error('Posts fetch error:', error)
    return { posts: [], count: 0 }
  }

  // Filter by category if specified
  let filteredPosts = posts
  if (filter?.category) {
    filteredPosts = posts?.filter((post) => {
      const postCategories = post.post_categories as unknown as Array<{ categories: { slug: string } | null }> | null
      return postCategories?.some(
        (pc) => pc.categories?.slug === filter.category
      )
    }) || []
  }

  return { posts: filteredPosts || [], count: count || 0 }
}

/** 一覧タブのバッジ用に出自ごとの記事件数を取得 */
export async function getPostTypeCounts(): Promise<{
  free: number
  mini: number
  long: number
}> {
  const supabase = createAdminClient()
  const [free, mini, long] = await Promise.all([
    supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('article_type', 'free'),
    supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('article_type', 'mini'),
    supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('article_type', 'long'),
  ])
  return {
    free: free.count ?? 0,
    mini: mini.count ?? 0,
    long: long.count ?? 0,
  }
}

export async function toggleFeatured(postId: string, currentValue: boolean) {
  const supabase = createAdminClient()

  // おすすめに追加する場合、既に6件あるかチェック
  if (!currentValue) {
    const { count } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('is_featured', true)

    if (count !== null && count >= 6) {
      return { success: false, error: 'おすすめ記事は最大6件までです' }
    }
  }

  const { error } = await supabase
    .from('posts')
    .update({ is_featured: !currentValue })
    .eq('id', postId)

  if (error) {
    console.error('Toggle featured error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/posts')
  revalidatePath('/')

  return { success: true }
}

export async function getCategories() {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('order_num')

  if (error) {
    console.error('Categories fetch error:', error)
    return []
  }

  return data || []
}

export async function getHashtags() {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('hashtags')
    .select('id, name, slug')
    .order('name')

  if (error) {
    console.error('Hashtags fetch error:', error)
    return []
  }

  return data || []
}

export interface ImportedOrigin {
  ig_username: string
  display_name: string
  ig_post_url: string | null
}

/**
 * かつて IG 取り込み (Phase 3B) で生成した記事の出自を返していたが、
 * Ticket 40 で ig_sources / ig_imported_posts を廃止したため常に null を返す。
 * (記事の出自はミニ記事=article_type='mini' で判別できる。
 *  情報窓口由来の表示が必要になったら mini_inquiries を参照して再実装する)
 */
export async function getImportedOrigin(
  _postId: string
): Promise<ImportedOrigin | null> {
  void _postId
  return null
}

// ------------------------------------------------------------
// AI 3段階要約の生成
// ------------------------------------------------------------

/** 記事本文から3段階要約を一括生成する */
export async function generateAISummaries(
  body: string
): Promise<
  | { success: true; summaries: Summaries }
  | { success: false; error: string }
> {
  await assertAdminAuth()

  if (!body || !body.trim()) {
    return { success: false, error: '本文を入力してから生成してください。' }
  }

  try {
    const summaries = await generateSummaries(body)
    if (!summaries.short && !summaries.medium && !summaries.long) {
      return {
        success: false,
        error: '要約を生成できませんでした。もう一度お試しください。',
      }
    }
    return { success: true, summaries }
  } catch (err) {
    console.error('[generateAISummaries] failed:', err)
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : '要約の生成に失敗しました。時間をおいて再度お試しください。',
    }
  }
}

/** 記事本文から指定レベル1つの要約を生成する (再生成用) */
export async function generateAISingleSummary(
  body: string,
  level: SummaryLevel
): Promise<
  | { success: true; summary: string }
  | { success: false; error: string }
> {
  await assertAdminAuth()

  if (!body || !body.trim()) {
    return { success: false, error: '本文を入力してから生成してください。' }
  }

  try {
    const summary = await generateSingleSummary(body, level)
    if (!summary) {
      return {
        success: false,
        error: '要約を生成できませんでした。もう一度お試しください。',
      }
    }
    return { success: true, summary }
  } catch (err) {
    console.error('[generateAISingleSummary] failed:', err)
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : '要約の生成に失敗しました。時間をおいて再度お試しください。',
    }
  }
}
