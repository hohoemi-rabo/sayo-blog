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
import { isArticleType, type ArticleTypeTab } from '@/lib/article-types'
import { PICKUP_COUNT } from '@/lib/home-slots'
import { RELATED_POSTS_COUNT, rankRelatedOptions } from '@/lib/related-posts'

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
  // 記事の種類 (投稿記事 / 取材記事 / 自由記事)
  article_type?: ArticleType
  // AI 3段階要約 — 未生成は null
  summary_short?: string | null
  summary_medium?: string | null
  summary_long?: string | null
  /** 手動で選んだ関連記事 (最大 3 件, 表示順)。空なら公開側が全部自動で選ぶ (Ticket 45) */
  related_post_ids?: string[]
}

/** 依頼の種類 = 紐付く記事の article_type (投稿記事 = mini / 取材記事 = long) */
export type InquiryKind = 'mini' | 'long'

/** 記事と依頼の紐付け。記事編集画面では「種類を変えられない」根拠として表示する */
export interface InquiryLink {
  kind: InquiryKind
  id: string
  /** 画面に出す依頼の説明 (依頼者名など) */
  label: string
}

export interface CreatePostOptions {
  /** 依頼管理の「自分で書く」「新規記事を作成」から来たとき、保存時に紐付ける依頼 */
  linkInquiry?: { kind: InquiryKind; id: string }
}

const INQUIRY_TABLES: Record<InquiryKind, string> = {
  mini: 'mini_inquiries',
  long: 'long_inquiries',
}

/** この記事を生成/紐付け元に持つ依頼を探す (無ければ null) */
async function findLinkedInquiry(
  supabase: ReturnType<typeof createAdminClient>,
  postId: string
): Promise<{ kind: InquiryKind; id: string } | null> {
  for (const kind of ['mini', 'long'] as const) {
    const { data } = await supabase
      .from(INQUIRY_TABLES[kind])
      .select('id')
      .eq('generated_post_id', postId)
      .limit(1)
      .maybeSingle()
    if (data) return { kind, id: data.id as string }
  }
  return null
}

/**
 * 関連記事の手動選択を保存する (delete → insert, post_hashtags と同じやり方)。
 * 重複・自分自身は除き、最大 RELATED_POSTS_COUNT 件まで。
 */
async function saveRelatedPosts(
  supabase: ReturnType<typeof createAdminClient>,
  postId: string,
  relatedPostIds: string[] | undefined
): Promise<string | null> {
  if (relatedPostIds === undefined) return null
  const ids = [...new Set(relatedPostIds)]
    .filter((rid) => rid !== postId)
    .slice(0, RELATED_POSTS_COUNT)

  const { error: delErr } = await supabase
    .from('post_related_posts')
    .delete()
    .eq('post_id', postId)
  if (delErr) return delErr.message

  if (ids.length === 0) return null
  const { error: insErr } = await supabase
    .from('post_related_posts')
    .insert(ids.map((rid, position) => ({ post_id: postId, related_post_id: rid, position })))
  return insErr ? insErr.message : null
}

/** 記事の公開 URL を作り直す (日本語 slug は URL ではパーセントエンコードされる) */
function revalidateArticlePath(categorySlug: string | null | undefined, slug: string | null | undefined) {
  if (!categorySlug || !slug) return
  revalidatePath(`/${categorySlug}/${encodeURIComponent(slug)}`)
}

/**
 * この記事を関連記事に手動で選んでいる記事のページを作り直す。
 * 記事ページは ISR (1 時間) なので、非公開・終了・削除・slug 変更がすぐ反映されないと
 * 古いカードや 404 へのリンクが残る。自動で選ばれた分は追えないので ISR の更新に任せる。
 * 記事を消す前に呼ぶこと (消すと CASCADE で選択の行も消える)。
 */
async function revalidatePagesPickingPost(
  supabase: ReturnType<typeof createAdminClient>,
  postId: string
): Promise<void> {
  const { data, error } = await supabase
    .from('post_related_posts')
    .select('post:posts!post_related_posts_post_id_fkey(slug, post_categories(categories(slug)))')
    .eq('related_post_id', postId)
  if (error) {
    console.error('Related posts lookup error:', error)
    return
  }
  for (const row of (data ?? []) as unknown as Array<{
    post: { slug: string; post_categories: Array<{ categories: { slug: string } | null }> | null } | null
  }>) {
    revalidateArticlePath(row.post?.post_categories?.[0]?.categories?.slug, row.post?.slug)
  }
}

async function getCategorySlug(
  supabase: ReturnType<typeof createAdminClient>,
  categoryId: string | null
): Promise<string | null> {
  if (!categoryId) return null
  const { data } = await supabase
    .from('categories')
    .select('slug')
    .eq('id', categoryId)
    .maybeSingle()
  return (data?.slug as string | undefined) ?? null
}

export async function createPost(
  data: PostFormData,
  options?: CreatePostOptions
) {
  await assertAdminAuth()
  const supabase = createAdminClient()

  // 依頼から作るときは、記事の種類を依頼に合わせる (画面の選択は信用しない)。
  // 投稿記事は元の SNS URL を source_urls に控える (AI 記事化と同じ)。
  if (!isArticleType(data.article_type)) {
    return { success: false, error: '記事の種類 (投稿記事 / 取材記事 / 自由記事) を選んでください' }
  }
  let articleType: ArticleType = data.article_type
  let sourceUrls: string[] | null = null
  const link = options?.linkInquiry
  if (link) {
    const { data: inquiry, error: inqErr } = await supabase
      .from(INQUIRY_TABLES[link.kind])
      .select(link.kind === 'mini' ? 'id, generated_post_id, sns_urls' : 'id, generated_post_id')
      .eq('id', link.id)
      .maybeSingle()
    if (inqErr) return { success: false, error: inqErr.message }
    if (!inquiry) return { success: false, error: '紐付け先の依頼が見つかりません' }
    const row = inquiry as unknown as { generated_post_id: string | null; sns_urls?: string[] }
    if (row.generated_post_id) {
      return { success: false, error: 'この依頼にはすでに記事が紐付いています' }
    }
    articleType = link.kind
    if (link.kind === 'mini') sourceUrls = row.sns_urls ?? null
  }

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
      article_type: articleType,
      source_urls: sourceUrls,
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

  // 記事はもう作れているので、ここで失敗にすると再保存で記事が二重にできる。
  // カテゴリ・ハッシュタグと同じくログだけ残して続ける (編集画面で選び直せる)
  const relatedErr = await saveRelatedPosts(supabase, post.id as string, data.related_post_ids)
  if (relatedErr) {
    console.error('Related posts save error:', relatedErr)
  }

  // 依頼から作成された場合、依頼レコードに紐付ける。
  // - 投稿記事: AI 記事化と同じく、記事ができた時点で依頼は「記事化済み」(published)
  // - 取材記事: 依頼の進行管理は別にあるので、記事を公開状態で保存したときだけ published
  if (link && post?.id) {
    const inquiryPatch: Record<string, unknown> = {
      generated_post_id: post.id,
    }
    if (link.kind === 'mini' || data.is_published) inquiryPatch.status = 'published'
    const { error: linkErr } = await supabase
      .from(INQUIRY_TABLES[link.kind])
      .update(inquiryPatch)
      .eq('id', link.id)
    if (linkErr) {
      console.error('Inquiry link error:', linkErr)
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
  revalidatePath('/sitemap.xml')
  revalidateArticlePath(await getCategorySlug(supabase, data.category_id), data.slug)

  if (data.is_published && post?.id) {
    const newPostId = post.id as string
    after(() => triggerIgAutoGenerate(newPostId))
  }

  return { success: true, post }
}

export async function updatePost(id: string, data: PostFormData) {
  await assertAdminAuth()
  const supabase = createAdminClient()

  // Capture the current is_published so we can detect a false -> true transition
  // and trigger IG auto-generation after the save succeeds.
  const { data: current } = await supabase
    .from('posts')
    .select('is_published, article_type, slug, post_categories(categories(slug))')
    .eq('id', id)
    .maybeSingle()
  // 保存前の公開 URL (slug・カテゴリを変えたとき、古い URL のページも作り直す)
  const previousCategorySlug =
    (current?.post_categories as unknown as Array<{ categories: { slug: string } | null }> | null)?.[0]
      ?.categories?.slug ?? null
  const previousSlug = (current?.slug as string | undefined) ?? null

  if (data.article_type && data.article_type !== current?.article_type) {
    if (!isArticleType(data.article_type)) {
      return { success: false, error: '記事の種類が正しくありません' }
    }
    // 依頼と紐付いた記事は種類を変えない (依頼一覧と記事一覧で食い違うため)
    const link = await findLinkedInquiry(supabase, id)
    if (link && link.kind !== data.article_type) {
      return {
        success: false,
        error: '依頼と紐付いている記事なので、記事の種類は変えられません',
      }
    }
  }

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
      ...(data.article_type ? { article_type: data.article_type } : {}),
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

  // 失敗しても記事本体はもう保存済みなので、公開連動・画像同期・再生成は続けてから知らせる
  // (ここで return すると、公開したのにトップや記事ページが古いまま残る)
  const relatedErr = await saveRelatedPosts(supabase, id, data.related_post_ids)
  if (relatedErr) {
    console.error('Related posts save error:', relatedErr)
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
  revalidatePath('/sitemap.xml')
  revalidateArticlePath(await getCategorySlug(supabase, data.category_id), data.slug)
  // slug・カテゴリを変えたときは古い URL のページも作り直す (同じ URL なら二重に呼ぶだけで無害)
  revalidateArticlePath(previousCategorySlug, previousSlug)
  // この記事を関連記事に選んでいる記事のページ (タイトル・URL・公開状態の変更を反映)
  await revalidatePagesPickingPost(supabase, id)

  if (!wasPublished && data.is_published) {
    after(() => triggerIgAutoGenerate(id))
  }

  if (relatedErr) {
    return {
      success: false,
      error: `記事は保存しましたが、関連記事の保存に失敗しました。もう一度保存してください (${relatedErr})`,
    }
  }
  return { success: true }
}

export async function deletePost(id: string) {
  await assertAdminAuth()
  const supabase = createAdminClient()

  // 削除で選択の行が消える前に、この記事を関連記事に選んでいるページを作り直す
  // (削除が失敗しても再生成されるだけで害は無い)
  await revalidatePagesPickingPost(supabase, id)

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
  revalidatePath('/sitemap.xml')

  return { success: true }
}

export async function getPost(id: string) {
  await assertAdminAuth()
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
  await assertAdminAuth()
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
    // 下書きを一番上に (書きかけを探しやすく)。その中と公開記事は公開日時 → 作成日の新しい順
    .order('is_published', { ascending: true })
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (filter?.status === 'published') {
    query = query.eq('is_published', true)
  } else if (filter?.status === 'draft') {
    query = query.eq('is_published', false)
  }

  // 'all' (すべて) は種類で絞らない
  if (filter?.articleType && filter.articleType !== 'all') {
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
export async function getPostTypeCounts(): Promise<Record<ArticleTypeTab, number>> {
  await assertAdminAuth()
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
  const counts = {
    free: free.count ?? 0,
    mini: mini.count ?? 0,
    long: long.count ?? 0,
  }
  return { all: counts.free + counts.mini + counts.long, ...counts }
}

/**
 * ★ (Pick Up に載せる) の件数。上限チェックは下書き等も含めた件数で行うので、表示も同じ数え方にする。
 * drafts / ended = ★が付いているがトップには出ない記事 (非公開 / 終了イベント) の数
 */
export async function getFeaturedCounts(): Promise<{
  total: number
  drafts: number
  ended: number
}> {
  await assertAdminAuth()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('posts')
    .select('is_published, event_ended')
    .eq('is_featured', true)
  if (error) {
    console.error('Featured count error:', error)
    return { total: 0, drafts: 0, ended: 0 }
  }
  return {
    total: data.length,
    drafts: data.filter((p) => !p.is_published).length,
    // 下書きと重なる記事は drafts 側で数える (二重に数えない)
    ended: data.filter((p) => p.is_published && p.event_ended).length,
  }
}

export async function toggleFeatured(postId: string, currentValue: boolean) {
  await assertAdminAuth()
  const supabase = createAdminClient()

  // ★を付ける場合、Pick Up の枠数を超えないかチェック
  if (!currentValue) {
    const { count } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('is_featured', true)

    if (count !== null && count >= PICKUP_COUNT) {
      return {
        success: false,
        error: `Pick Up に載せられるのは ${PICKUP_COUNT} 件までです。ほかの記事の★を外してください`,
      }
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

/**
 * 記事に紐付いた依頼を、記事編集画面の表示用に返す (無ければ null)。
 * 紐付いている記事は「記事の種類」を変えられない。
 */
export async function getPostInquiryLink(
  postId: string
): Promise<InquiryLink | null> {
  await assertAdminAuth()
  const supabase = createAdminClient()
  const link = await findLinkedInquiry(supabase, postId)
  if (!link) return null
  return { ...link, label: `依頼 #${link.id.slice(0, 8)}` }
}

// ------------------------------------------------------------
// 関連記事の手動選択 (Ticket 45)
// ------------------------------------------------------------

/** 関連記事の選択 UI に出す記事 1 件 */
export interface RelatedPostOption {
  id: string
  title: string
  is_published: boolean
  event_ended: boolean
  published_at: string | null
}

const RELATED_OPTION_COLUMNS = 'id, title, is_published, event_ended, published_at'

/** 編集画面を開いたときの、保存済みの関連記事 (表示順) */
export async function getRelatedPostSelection(postId: string): Promise<RelatedPostOption[]> {
  await assertAdminAuth()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('post_related_posts')
    .select(`position, related:posts!post_related_posts_related_post_id_fkey(${RELATED_OPTION_COLUMNS})`)
    .eq('post_id', postId)
    .order('position')
  if (error) {
    console.error('Related posts fetch error:', error)
    return []
  }
  return (data as unknown as Array<{ related: RelatedPostOption | null }>).flatMap((row) =>
    row.related ? [row.related] : []
  )
}

/** 関連記事の検索で一度に返す件数 */
const RELATED_OPTIONS_LIMIT = 20

/**
 * 関連記事に選ぶ記事を探す。並びは 公開ページに出る記事 → 同じカテゴリ → 共通ハッシュタグが多い → 新しい
 * (`rankRelatedOptions`)。query があればタイトルの部分一致で絞る。下書き・終了イベントも返す (画面でバッジを付ける)。
 * current = 編集中の記事のカテゴリ・ハッシュタグ (保存前の値)。excludeId = 編集中の記事 (自分自身は選べない)
 */
export async function searchRelatedPostOptions(
  query: string,
  current: { excludeId?: string; categoryId: string | null; hashtagIds: string[] }
): Promise<RelatedPostOption[]> {
  await assertAdminAuth()
  const supabase = createAdminClient()
  // PostgREST の ilike で特別な意味を持つ文字は除く (検索語としては不要)
  const q = query.replace(/[%_,()\\*]/g, ' ').trim().slice(0, 50)

  // 並べ替えに全候補が要る。取るのは軽い列だけ (記事は数百件規模)
  let req = supabase
    .from('posts')
    .select(`${RELATED_OPTION_COLUMNS}, post_categories(category_id), post_hashtags(hashtag_id)`)
  if (q) req = req.ilike('title', `%${q}%`)
  if (current.excludeId) req = req.neq('id', current.excludeId)

  const { data, error } = await req
  if (error) {
    console.error('Related posts search error:', error)
    return []
  }

  type Row = RelatedPostOption & {
    post_categories: Array<{ category_id: string }> | null
    post_hashtags: Array<{ hashtag_id: string }> | null
  }
  const ranked = rankRelatedOptions(
    ((data ?? []) as unknown as Row[]).map((row) => ({
      row,
      id: row.id,
      publishedAt: row.published_at,
      isPublished: row.is_published,
      eventEnded: row.event_ended,
      categoryIds: (row.post_categories ?? []).map((pc) => pc.category_id),
      hashtagIds: (row.post_hashtags ?? []).map((ph) => ph.hashtag_id),
    })),
    { categoryId: current.categoryId, hashtagIds: current.hashtagIds }
  )
  return ranked.slice(0, RELATED_OPTIONS_LIMIT).map(({ row }) => ({
    id: row.id,
    title: row.title,
    is_published: row.is_published,
    event_ended: row.event_ended,
    published_at: row.published_at,
  }))
}
