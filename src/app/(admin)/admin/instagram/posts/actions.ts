'use server'

import { createAdminClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { assertAdminAuth } from '@/lib/admin-auth'
import { generateIgCaptions } from '@/lib/ig-caption-generator'
import { parsePostSections, type PostSection } from '@/lib/post-sections'
import type {
  IgPost,
  IgPostStatus,
  IgPostWithRelations,
} from '@/lib/types'
import type { IgPostStatusFilter } from './filters'

const ADMIN_PATH = '/admin/instagram/posts'
const DEFAULT_LIMIT = 50
const RETRY_MAX_ATTEMPTS = 3
const RETRY_INITIAL_BACKOFF_MS = 500

export interface IgPostsFilter {
  status?: IgPostStatusFilter
  post_id?: string
  limit?: number
  offset?: number
}

export interface IgPostsResult {
  items: IgPostWithRelations[]
  totalCount: number
}

export type ActionResult<T = undefined> =
  | ({ success: true } & (T extends undefined ? { data?: never } : { data: T }))
  | { success: false; error: string }

// ------------------------------------------------------------
// Queries
// ------------------------------------------------------------

export async function getIgPosts(filter: IgPostsFilter = {}): Promise<IgPostsResult> {
  const supabase = createAdminClient()
  const limit = filter.limit ?? DEFAULT_LIMIT
  const offset = filter.offset ?? 0

  let countQuery = supabase.from('ig_posts').select('*', { count: 'exact', head: true })
  if (filter.status && filter.status !== 'all') {
    countQuery = countQuery.eq('status', filter.status)
  }
  if (filter.post_id) {
    countQuery = countQuery.eq('post_id', filter.post_id)
  }
  const { count } = await countQuery

  let query = supabase
    .from('ig_posts')
    .select(
      `
      *,
      post:posts(id, title, slug, thumbnail_url)
    `
    )
    .order('post_id', { ascending: false })
    .order('sequence_number', { ascending: true })
    .range(offset, offset + limit - 1)

  if (filter.status && filter.status !== 'all') {
    query = query.eq('status', filter.status)
  }
  if (filter.post_id) {
    query = query.eq('post_id', filter.post_id)
  }

  const { data, error } = await query
  if (error) {
    console.error('[getIgPosts] error:', error)
    return { items: [], totalCount: 0 }
  }

  const items = (data ?? []).map(normalizeIgPostRow)
  return { items, totalCount: count ?? 0 }
}

export interface PostSectionSummary {
  index: number
  heading: string
  hasImage: boolean
  textPreview: string // first ~80 chars, plain text
}

/**
 * Return the h2-based sections of a published article, formatted for the
 * GenerateDialog UI. Empty array if the article has no <h2> structure.
 */
export async function getPostSections(
  postId: string
): Promise<{ sections: PostSectionSummary[]; articleEditUrl: string }> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('posts')
    .select('id, content')
    .eq('id', postId)
    .eq('is_published', true)
    .maybeSingle()

  if (error || !data) {
    return { sections: [], articleEditUrl: `/admin/posts/${postId}` }
  }

  const sections = parsePostSections(data.content).map(
    (s: PostSection): PostSectionSummary => ({
      index: s.index,
      heading: s.heading,
      hasImage: Boolean(s.imageUrl),
      textPreview:
        s.text.length > 80 ? `${s.text.slice(0, 80).trim()}…` : s.text,
    })
  )

  return { sections, articleEditUrl: `/admin/posts/${postId}` }
}

export async function getPublishedPostsForSelect(): Promise<
  Array<{ id: string; title: string; slug: string }>
> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('posts')
    .select('id, title, slug')
    .eq('is_published', true)
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    console.error('[getPublishedPostsForSelect] error:', error)
    return []
  }
  return data ?? []
}

// ------------------------------------------------------------
// Mutations
// ------------------------------------------------------------

export async function generateIgPosts(
  postId: string,
  sectionIndexes: number[]
): Promise<ActionResult<IgPost[]>> {
  try {
    await assertAdminAuth()
  } catch {
    return { success: false, error: '認証が必要です' }
  }

  if (!postId) return { success: false, error: 'post_id が指定されていません' }
  if (!Array.isArray(sectionIndexes) || sectionIndexes.length === 0) {
    return { success: false, error: 'セクションを 1 つ以上選択してください' }
  }
  if (sectionIndexes.length > 10) {
    return { success: false, error: '一度に生成できるのは 10 セクションまでです' }
  }

  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('ig_posts')
    .select('sequence_number')
    .eq('post_id', postId)
    .order('sequence_number', { ascending: false })
    .limit(1)
  const nextSequence =
    existing && existing.length > 0 ? existing[0].sequence_number + 1 : 1

  let generated
  try {
    generated = await generateIgCaptions({
      postId,
      sectionIndexes,
      startSequence: nextSequence,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'キャプション生成に失敗しました'
    return { success: false, error: message }
  }

  const rows = generated.map((g) => ({
    post_id: postId,
    caption: g.caption,
    hashtags: g.hashtags,
    image_url: g.image_url,
    sequence_number: g.sequence_number,
    status: 'draft' as IgPostStatus,
  }))

  const insertResult = await withRetry(
    async () => await supabase.from('ig_posts').insert(rows).select('*'),
    'generateIgPosts.insert'
  )
  if (insertResult.error) {
    return { success: false, error: friendlyDbError(insertResult.error) }
  }

  revalidatePath(ADMIN_PATH)
  return { success: true, data: (insertResult.data ?? []) as IgPost[] }
}

export async function updateIgPost(
  id: string,
  patch: {
    caption?: string
    hashtags?: string[]
    image_url?: string | null
  }
): Promise<ActionResult> {
  try {
    await assertAdminAuth()
  } catch {
    return { success: false, error: '認証が必要です' }
  }

  const updates: Record<string, unknown> = {}
  if (typeof patch.caption === 'string') {
    updates.caption = patch.caption
    // Keep hashtags[] in sync with whatever tags are present in the caption.
    // This ensures edits to the caption are reflected in the metadata array
    // used for filtering / future features.
    updates.hashtags = extractHashtagsFromCaption(patch.caption)
  } else if (Array.isArray(patch.hashtags)) {
    // Allow direct hashtags-only updates (e.g., from programmatic callers)
    updates.hashtags = patch.hashtags
  }
  if (patch.image_url !== undefined) updates.image_url = patch.image_url

  if (Object.keys(updates).length === 0) {
    return { success: false, error: '更新項目がありません' }
  }

  const supabase = createAdminClient()
  const result = await withRetry(
    async () => await supabase.from('ig_posts').update(updates).eq('id', id),
    'updateIgPost'
  )
  if (result.error) {
    return { success: false, error: friendlyDbError(result.error) }
  }

  revalidatePath(ADMIN_PATH)
  return { success: true }
}

export async function markIgPostManualPublished(id: string): Promise<ActionResult> {
  try {
    await assertAdminAuth()
  } catch {
    return { success: false, error: '認証が必要です' }
  }

  const supabase = createAdminClient()
  const result = await withRetry(
    async () =>
      await supabase
        .from('ig_posts')
        .update({
          status: 'manual_published' as IgPostStatus,
          instagram_published_at: new Date().toISOString(),
        })
        .eq('id', id),
    'markIgPostManualPublished'
  )
  if (result.error) {
    return { success: false, error: friendlyDbError(result.error) }
  }

  revalidatePath(ADMIN_PATH)
  return { success: true }
}

export async function deleteIgPost(id: string): Promise<ActionResult> {
  try {
    await assertAdminAuth()
  } catch {
    return { success: false, error: '認証が必要です' }
  }

  const supabase = createAdminClient()

  const { data: target } = await supabase
    .from('ig_posts')
    .select('image_url')
    .eq('id', id)
    .maybeSingle()

  if (target?.image_url) {
    await deleteStorageObjectIfOwned(target.image_url)
  }

  const result = await withRetry(
    async () => await supabase.from('ig_posts').delete().eq('id', id),
    'deleteIgPost'
  )
  if (result.error) {
    return { success: false, error: friendlyDbError(result.error) }
  }

  revalidatePath(ADMIN_PATH)
  return { success: true }
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

interface RawJoinedPost {
  id: string
  title: string
  slug: string
  thumbnail_url: string | null
}

interface RawIgPostRow extends IgPost {
  post?: RawJoinedPost | RawJoinedPost[] | null
}

function normalizeIgPostRow(raw: RawIgPostRow): IgPostWithRelations {
  const { post, ...rest } = raw
  let single: RawJoinedPost | undefined
  if (Array.isArray(post)) {
    single = post[0]
  } else if (post) {
    single = post
  }
  return {
    ...(rest as IgPost),
    post: single
      ? {
          id: single.id,
          title: single.title,
          slug: single.slug,
          thumbnail_url: single.thumbnail_url ?? undefined,
        }
      : undefined,
  }
}

async function deleteStorageObjectIfOwned(url: string): Promise<void> {
  const marker = '/storage/v1/object/public/ig-posts/'
  const idx = url.indexOf(marker)
  if (idx === -1) return // Not in our bucket — skip (e.g., re-used thumbnail URL)

  const path = url.slice(idx + marker.length)
  if (!path) return

  const supabase = createAdminClient()
  const { error } = await supabase.storage.from('ig-posts').remove([path])
  if (error) {
    console.error('[deleteStorageObjectIfOwned] failed:', error)
  }
}

/**
 * Retry wrapper for Supabase queries that can hit transient Cloudflare 5xx errors.
 * Retries only on transient errors (5xx / timeout / network) — not on validation errors.
 */
async function withRetry<T extends { data: unknown; error: unknown }>(
  op: () => Promise<T>,
  label: string
): Promise<T> {
  let lastResult: T | undefined
  for (let attempt = 1; attempt <= RETRY_MAX_ATTEMPTS; attempt++) {
    try {
      const result = await op()
      if (!result.error) return result
      lastResult = result
      if (!isTransientError(result.error)) {
        console.error(`[${label}] non-retriable error:`, result.error)
        return result
      }
      console.warn(
        `[${label}] transient error on attempt ${attempt}/${RETRY_MAX_ATTEMPTS}`
      )
    } catch (thrown) {
      console.warn(
        `[${label}] thrown on attempt ${attempt}/${RETRY_MAX_ATTEMPTS}:`,
        thrown
      )
      if (attempt === RETRY_MAX_ATTEMPTS) {
        return { data: null, error: thrown } as unknown as T
      }
    }
    if (attempt < RETRY_MAX_ATTEMPTS) {
      await sleep(RETRY_INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1))
    }
  }
  return (
    lastResult ??
    ({ data: null, error: new Error('Retry exhausted') } as unknown as T)
  )
}

function isTransientError(err: unknown): boolean {
  if (!err) return false
  const message =
    typeof err === 'string'
      ? err
      : err instanceof Error
        ? err.message
        : typeof (err as { message?: unknown }).message === 'string'
          ? ((err as { message: string }).message)
          : ''

  if (!message) return false
  // Cloudflare / gateway HTML responses
  if (/<!DOCTYPE|Bad gateway|502|503|504|gateway/i.test(message)) return true
  // Network timeouts
  if (/timeout|ETIMEDOUT|ECONNRESET|fetch failed/i.test(message)) return true
  return false
}

function friendlyDbError(err: unknown): string {
  const message =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : typeof (err as { message?: unknown }).message === 'string'
          ? (err as { message: string }).message
          : 'Unknown error'

  if (isTransientError(message)) {
    return 'サーバーが一時的に応答しませんでした。数秒後にもう一度お試しください。'
  }
  // Truncate long error payloads so Toast stays readable
  return message.length > 200 ? `${message.slice(0, 200)}…` : message
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Extract hashtags from a caption text.
 * Matches tokens starting with # up to the next whitespace or #.
 * Returns tag names WITH the leading # (consistent with how hashtags are stored).
 */
function extractHashtagsFromCaption(caption: string): string[] {
  const matches = caption.match(/#[^\s#]+/g) ?? []
  // Preserve first-occurrence order, dedupe case-insensitively
  const seen = new Set<string>()
  const result: string[] = []
  for (const tag of matches) {
    const key = tag.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(tag)
  }
  return result
}
