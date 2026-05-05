'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase'
import { assertAdminAuth } from '@/lib/admin-auth'
import {
  type ActionResult,
  friendlyDbError,
  withRetry,
} from '@/lib/ig-action-utils'
import type {
  IgImportedPostWithSource,
  IgImportedStatus,
  Post,
} from '@/lib/types'
import {
  type ImportsFilter,
  IMPORTS_PAGE_SIZE,
} from './filters'

const ADMIN_PATH = '/admin/instagram/imports'
const STORAGE_BUCKET = 'ig-imported'
const STORAGE_MARKER = `/storage/v1/object/public/${STORAGE_BUCKET}/`

export interface ImportsResult {
  items: IgImportedPostWithSource[]
  total: number
}

interface RawImportRow {
  id: string
  source_id: string
  ig_post_id: string
  caption: string | null
  image_urls: string[] | null
  stored_image_urls: string[] | null
  ig_posted_at: string | null
  likes_count: number | null
  comment_count: number | null
  ig_post_url: string | null
  status: IgImportedStatus
  generated_post_id: string | null
  selected_image_indexes: number[] | null
  created_at: string
  updated_at: string
  source:
    | { ig_username: string; display_name: string; category_slug: string | null }
    | Array<{ ig_username: string; display_name: string; category_slug: string | null }>
    | null
  post:
    | Pick<Post, 'id' | 'title' | 'slug'>
    | Array<Pick<Post, 'id' | 'title' | 'slug'>>
    | null
}

// ------------------------------------------------------------
// Queries
// ------------------------------------------------------------

export async function getIgImportedPosts(
  filter: ImportsFilter
): Promise<ImportsResult> {
  const supabase = createAdminClient()
  const offset = (filter.page - 1) * IMPORTS_PAGE_SIZE
  const sanitizedQ = filter.q ? sanitizeSearchTerm(filter.q) : ''

  // Count query
  let countQuery = supabase
    .from('ig_imported_posts')
    .select('id', { count: 'exact', head: true })
  countQuery = applyFilters(countQuery, filter, sanitizedQ)

  const { count: total } = await countQuery

  // Data query
  let dataQuery = supabase
    .from('ig_imported_posts')
    .select(
      `
      id, source_id, ig_post_id, caption, image_urls, stored_image_urls,
      ig_posted_at, likes_count, comment_count, ig_post_url, status,
      generated_post_id, selected_image_indexes, created_at, updated_at,
      source:ig_sources(ig_username, display_name, category_slug),
      post:posts(id, title, slug)
      `
    )
    .range(offset, offset + IMPORTS_PAGE_SIZE - 1)
  dataQuery = applyFilters(dataQuery, filter, sanitizedQ)
  dataQuery = applySort(dataQuery, filter.sort)

  const { data, error } = await dataQuery

  if (error) {
    console.error('[getIgImportedPosts] error:', error)
    return { items: [], total: 0 }
  }

  const items = ((data ?? []) as RawImportRow[]).map(normalizeRow)
  return { items, total: total ?? 0 }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters(query: any, filter: ImportsFilter, sanitizedQ: string) {
  let q = query
  if (filter.status && filter.status !== 'all') {
    q = q.eq('status', filter.status)
  }
  if (filter.source_id) {
    q = q.eq('source_id', filter.source_id)
  }
  if (sanitizedQ) {
    q = q.ilike('caption', `%${sanitizedQ}%`)
  }
  return q
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applySort(query: any, sort: ImportsFilter['sort']) {
  if (sort === 'likes') {
    return query
      .order('likes_count', { ascending: false, nullsFirst: false })
      .order('ig_posted_at', { ascending: false, nullsFirst: false })
  }
  return query
    .order('ig_posted_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
}

function normalizeRow(row: RawImportRow): IgImportedPostWithSource {
  const source = Array.isArray(row.source) ? row.source[0] : row.source
  const post = Array.isArray(row.post) ? row.post[0] : row.post
  return {
    id: row.id,
    source_id: row.source_id,
    ig_post_id: row.ig_post_id,
    caption: row.caption,
    image_urls: row.image_urls,
    stored_image_urls: row.stored_image_urls,
    ig_posted_at: row.ig_posted_at,
    likes_count: row.likes_count,
    comment_count: row.comment_count,
    ig_post_url: row.ig_post_url,
    status: row.status,
    generated_post_id: row.generated_post_id,
    selected_image_indexes: row.selected_image_indexes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    source: source ?? undefined,
    post: post ?? undefined,
  }
}

// ------------------------------------------------------------
// Mutations
// ------------------------------------------------------------

export async function updateImportStatus(
  id: string,
  status: IgImportedStatus
): Promise<ActionResult> {
  await assertAdminAuth()
  const supabase = createAdminClient()

  const { error } = await withRetry(
    async () =>
      await supabase
        .from('ig_imported_posts')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('id')
        .maybeSingle(),
    'updateImportStatus'
  )

  if (error) {
    console.error('[updateImportStatus] error:', error)
    return { success: false, error: friendlyDbError(error) }
  }

  revalidatePath(ADMIN_PATH)
  return { success: true }
}

export async function updateSelectedImages(
  id: string,
  indexes: number[] | null
): Promise<ActionResult> {
  await assertAdminAuth()
  const supabase = createAdminClient()

  const normalized = indexes && indexes.length > 0 ? Array.from(new Set(indexes)).sort((a, b) => a - b) : null

  const { error } = await withRetry(
    async () =>
      await supabase
        .from('ig_imported_posts')
        .update({
          selected_image_indexes: normalized,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('id')
        .maybeSingle(),
    'updateSelectedImages'
  )

  if (error) {
    console.error('[updateSelectedImages] error:', error)
    return { success: false, error: friendlyDbError(error) }
  }

  revalidatePath(ADMIN_PATH)
  return { success: true }
}

export async function deleteImport(id: string): Promise<ActionResult> {
  await assertAdminAuth()
  const supabase = createAdminClient()

  // 1. Pre-fetch row to check generated_post_id and gather Storage URLs.
  const { data: target, error: fetchError } = await supabase
    .from('ig_imported_posts')
    .select('id, generated_post_id, stored_image_urls')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) {
    console.error('[deleteImport] fetch error:', fetchError)
    return { success: false, error: friendlyDbError(fetchError) }
  }
  if (!target) {
    return { success: false, error: '対象の投稿が見つかりませんでした' }
  }
  if (target.generated_post_id) {
    return {
      success: false,
      error: '生成済みの記事があるため削除できません',
    }
  }

  // 2. Best-effort Storage cleanup. DB delete proceeds even on Storage failure.
  const urls = (target.stored_image_urls ?? []) as string[]
  await Promise.all(urls.map((url) => deleteIgImportedStorageObject(url)))

  // 3. DB delete.
  const { error: deleteError } = await withRetry(
    async () =>
      await supabase
        .from('ig_imported_posts')
        .delete()
        .eq('id', id)
        .select('id')
        .maybeSingle(),
    'deleteImport'
  )

  if (deleteError) {
    console.error('[deleteImport] delete error:', deleteError)
    return { success: false, error: friendlyDbError(deleteError) }
  }

  revalidatePath(ADMIN_PATH)
  return { success: true }
}

export async function startGenerateArticle(
  id: string,
  selectedIndexes: number[]
): Promise<ActionResult<{ post_id?: string }>> {
  await assertAdminAuth()
  if (selectedIndexes.length === 0) {
    return { success: false, error: '画像を 1 枚以上選択してください' }
  }

  const selResult = await updateSelectedImages(id, selectedIndexes)
  if (!selResult.success) return { success: false, error: selResult.error }

  const statusResult = await updateImportStatus(id, 'processing')
  if (!statusResult.success) return { success: false, error: statusResult.error }

  // TODO(Ticket 37): POST /api/admin/instagram/imports/[id]/generate を呼んで
  // AI 記事生成 → 失敗時は status='pending' にロールバック。
  // 今は status='processing' に変更したところまで。

  revalidatePath(ADMIN_PATH)
  return { success: true, data: {} }
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

async function deleteIgImportedStorageObject(url: string): Promise<void> {
  const idx = url.indexOf(STORAGE_MARKER)
  if (idx === -1) return

  const path = url.slice(idx + STORAGE_MARKER.length)
  if (!path) return

  const supabase = createAdminClient()
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path])
  if (error) {
    console.warn('[deleteIgImportedStorageObject] failed:', error)
  }
}

function sanitizeSearchTerm(raw: string): string {
  return raw.replace(/[%(),"]/g, '').trim().slice(0, 100)
}
