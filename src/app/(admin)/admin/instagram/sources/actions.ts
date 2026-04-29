'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase'
import { assertAdminAuth } from '@/lib/admin-auth'
import {
  type ActionResult,
  friendlyDbError,
  isUniqueViolation,
  withRetry,
} from '@/lib/ig-action-utils'
import type { IgPermissionStatus, IgSource } from '@/lib/types'
import type { IgActiveFilter, IgPermissionFilter } from './filters'

const ADMIN_PATH = '/admin/instagram/sources'
const DEFAULT_LIMIT = 200
const PERMISSION_VALUES: IgPermissionStatus[] = [
  'not_requested',
  'requested',
  'approved',
  'denied',
]

export interface IgSourcesFilter {
  permission_status?: IgPermissionFilter
  is_active?: IgActiveFilter
  category_slug?: string
  q?: string
  limit?: number
  offset?: number
}

export interface IgSourcesResult {
  items: IgSource[]
  totalCount: number
}

export interface CategoryOption {
  id: string
  name: string
  slug: string
}

export interface IgSourceInput {
  ig_username: string
  display_name: string
  category_slug?: string | null
  permission_status: IgPermissionStatus
  permission_date?: string | null
  permission_memo?: string | null
  contact_info?: string | null
  is_active?: boolean
}

// ------------------------------------------------------------
// Queries
// ------------------------------------------------------------

export async function getIgSources(
  filter: IgSourcesFilter = {}
): Promise<IgSourcesResult> {
  const supabase = createAdminClient()
  const limit = filter.limit ?? DEFAULT_LIMIT
  const offset = filter.offset ?? 0
  const sanitizedQ = filter.q ? sanitizeSearchTerm(filter.q) : ''

  let countQuery = supabase
    .from('ig_sources')
    .select('*', { count: 'exact', head: true })
  if (filter.permission_status && filter.permission_status !== 'all') {
    countQuery = countQuery.eq('permission_status', filter.permission_status)
  }
  if (filter.is_active === 'active') {
    countQuery = countQuery.eq('is_active', true)
  } else if (filter.is_active === 'inactive') {
    countQuery = countQuery.eq('is_active', false)
  }
  if (filter.category_slug) {
    countQuery = countQuery.eq('category_slug', filter.category_slug)
  }
  if (sanitizedQ) {
    countQuery = countQuery.or(
      `ig_username.ilike.%${sanitizedQ}%,display_name.ilike.%${sanitizedQ}%`
    )
  }
  const { count } = await countQuery

  let dataQuery = supabase
    .from('ig_sources')
    .select('*')
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (filter.permission_status && filter.permission_status !== 'all') {
    dataQuery = dataQuery.eq('permission_status', filter.permission_status)
  }
  if (filter.is_active === 'active') {
    dataQuery = dataQuery.eq('is_active', true)
  } else if (filter.is_active === 'inactive') {
    dataQuery = dataQuery.eq('is_active', false)
  }
  if (filter.category_slug) {
    dataQuery = dataQuery.eq('category_slug', filter.category_slug)
  }
  if (sanitizedQ) {
    dataQuery = dataQuery.or(
      `ig_username.ilike.%${sanitizedQ}%,display_name.ilike.%${sanitizedQ}%`
    )
  }

  const { data, error } = await dataQuery

  if (error) {
    console.error('[getIgSources] error:', error)
    return { items: [], totalCount: 0 }
  }

  return { items: (data ?? []) as IgSource[], totalCount: count ?? 0 }
}

export async function getCategoriesForSelect(): Promise<CategoryOption[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('order_num', { ascending: true })

  if (error) {
    console.error('[getCategoriesForSelect] error:', error)
    return []
  }
  return (data ?? []) as CategoryOption[]
}

export async function getIgSourceById(id: string): Promise<IgSource | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('ig_sources')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) {
    console.error('[getIgSourceById] error:', error)
    return null
  }
  return (data as IgSource | null) ?? null
}

export async function getApprovedActiveSources(): Promise<IgSource[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('ig_sources')
    .select('*')
    .eq('permission_status', 'approved')
    .eq('is_active', true)
    .order('display_name', { ascending: true })

  if (error) {
    console.error('[getApprovedActiveSources] error:', error)
    return []
  }
  return (data ?? []) as IgSource[]
}

export async function getRelatedImportedCount(
  sourceId: string
): Promise<number> {
  try {
    await assertAdminAuth()
  } catch {
    return 0
  }

  const supabase = createAdminClient()
  const { count, error } = await supabase
    .from('ig_imported_posts')
    .select('id', { count: 'exact', head: true })
    .eq('source_id', sourceId)

  if (error) {
    console.error('[getRelatedImportedCount] error:', error)
    return 0
  }
  return count ?? 0
}

// ------------------------------------------------------------
// Mutations
// ------------------------------------------------------------

export async function createIgSource(
  input: IgSourceInput
): Promise<ActionResult<IgSource>> {
  try {
    await assertAdminAuth()
  } catch {
    return { success: false, error: '認証が必要です', code: 'auth' }
  }

  const validated = validateAndNormalize(input, { partial: false })
  if ('error' in validated) {
    return { success: false, error: validated.error, code: 'validation' }
  }

  const supabase = createAdminClient()
  const result = await withRetry(
    async () =>
      await supabase.from('ig_sources').insert(validated.value).select('*').single(),
    'createIgSource'
  )

  if (result.error) {
    if (isUniqueViolation(result.error)) {
      return {
        success: false,
        error: 'このユーザー名は既に登録されています',
        code: 'duplicate',
      }
    }
    return { success: false, error: friendlyDbError(result.error) }
  }

  revalidatePath(ADMIN_PATH)
  return { success: true, data: result.data as IgSource }
}

export async function updateIgSource(
  id: string,
  patch: Partial<IgSourceInput>
): Promise<ActionResult<IgSource>> {
  try {
    await assertAdminAuth()
  } catch {
    return { success: false, error: '認証が必要です', code: 'auth' }
  }

  if (!id) {
    return { success: false, error: 'id が指定されていません', code: 'validation' }
  }

  const supabase = createAdminClient()

  const { data: existing, error: fetchError } = await supabase
    .from('ig_sources')
    .select('permission_status')
    .eq('id', id)
    .maybeSingle()
  if (fetchError) {
    return { success: false, error: friendlyDbError(fetchError) }
  }
  if (!existing) {
    return { success: false, error: '対象が見つかりません', code: 'not_found' }
  }

  const merged: IgSourceInput = {
    ig_username: patch.ig_username ?? '__unchanged__',
    display_name: patch.display_name ?? '__unchanged__',
    category_slug: patch.category_slug,
    permission_status:
      patch.permission_status ??
      (existing.permission_status as IgPermissionStatus),
    permission_date: patch.permission_date,
    permission_memo: patch.permission_memo,
    contact_info: patch.contact_info,
    is_active: patch.is_active,
  }

  const validated = validateAndNormalize(merged, { partial: true, patch })
  if ('error' in validated) {
    return { success: false, error: validated.error, code: 'validation' }
  }

  if (Object.keys(validated.value).length === 0) {
    return { success: false, error: '更新項目がありません', code: 'validation' }
  }

  const result = await withRetry(
    async () =>
      await supabase
        .from('ig_sources')
        .update(validated.value)
        .eq('id', id)
        .select('*')
        .single(),
    'updateIgSource'
  )

  if (result.error) {
    if (isUniqueViolation(result.error)) {
      return {
        success: false,
        error: 'このユーザー名は既に登録されています',
        code: 'duplicate',
      }
    }
    return { success: false, error: friendlyDbError(result.error) }
  }

  revalidatePath(ADMIN_PATH)
  return { success: true, data: result.data as IgSource }
}

export async function deleteIgSource(id: string): Promise<ActionResult> {
  try {
    await assertAdminAuth()
  } catch {
    return { success: false, error: '認証が必要です', code: 'auth' }
  }

  const supabase = createAdminClient()
  const result = await withRetry(
    async () => await supabase.from('ig_sources').delete().eq('id', id),
    'deleteIgSource'
  )

  if (result.error) {
    return { success: false, error: friendlyDbError(result.error) }
  }

  revalidatePath(ADMIN_PATH)
  return { success: true }
}

// ------------------------------------------------------------
// Validation
// ------------------------------------------------------------

interface ValidationOk {
  value: Record<string, unknown>
}
interface ValidationErr {
  error: string
}

const IG_USERNAME_PATTERN = /^[a-zA-Z0-9._]{1,30}$/

function normalizeIgUsername(raw: string): string {
  return raw.trim().replace(/^@+/, '')
}

function validateAndNormalize(
  input: IgSourceInput,
  options: { partial: boolean; patch?: Partial<IgSourceInput> }
): ValidationOk | ValidationErr {
  const { partial, patch } = options
  const out: Record<string, unknown> = {}

  // ig_username
  if (!partial || (patch && patch.ig_username !== undefined)) {
    if (typeof input.ig_username !== 'string') {
      return { error: 'ig_username が必要です' }
    }
    const username = normalizeIgUsername(input.ig_username)
    if (!username) {
      return { error: 'IG ユーザー名は必須です' }
    }
    if (!IG_USERNAME_PATTERN.test(username)) {
      return {
        error:
          'IG ユーザー名は半角英数字 / "." / "_" のみ、1〜30 文字で入力してください',
      }
    }
    out.ig_username = username
  }

  // display_name
  if (!partial || (patch && patch.display_name !== undefined)) {
    if (typeof input.display_name !== 'string') {
      return { error: 'display_name が必要です' }
    }
    const name = input.display_name.trim()
    if (name.length < 1 || name.length > 100) {
      return { error: '表示名は 1〜100 文字で入力してください' }
    }
    out.display_name = name
  }

  // category_slug
  if (!partial || (patch && patch.category_slug !== undefined)) {
    if (input.category_slug == null || input.category_slug === '') {
      out.category_slug = null
    } else {
      const slug = String(input.category_slug).trim()
      if (slug.length > 64) {
        return { error: 'カテゴリ slug が長すぎます' }
      }
      out.category_slug = slug
    }
  }

  // permission_status
  if (!partial || (patch && patch.permission_status !== undefined)) {
    if (!PERMISSION_VALUES.includes(input.permission_status)) {
      return { error: '許可状態の値が不正です' }
    }
    out.permission_status = input.permission_status
  }

  // permission_date
  if (!partial || (patch && patch.permission_date !== undefined)) {
    if (input.permission_date == null || input.permission_date === '') {
      out.permission_date = null
    } else {
      const date = String(input.permission_date).trim()
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return { error: '許可日は YYYY-MM-DD 形式で入力してください' }
      }
      out.permission_date = date
    }
  }

  // permission_memo
  if (!partial || (patch && patch.permission_memo !== undefined)) {
    if (input.permission_memo == null) {
      out.permission_memo = null
    } else {
      const memo = String(input.permission_memo)
      if (memo.length > 1000) {
        return { error: '許可メモは 1000 文字以内で入力してください' }
      }
      out.permission_memo = memo === '' ? null : memo
    }
  }

  // contact_info
  if (!partial || (patch && patch.contact_info !== undefined)) {
    if (input.contact_info == null) {
      out.contact_info = null
    } else {
      const contact = String(input.contact_info).trim()
      if (contact.length > 200) {
        return { error: '連絡先は 200 文字以内で入力してください' }
      }
      out.contact_info = contact === '' ? null : contact
    }
  }

  // is_active — enforce: approved 以外は強制 false
  const finalPermissionStatus =
    (out.permission_status as IgPermissionStatus | undefined) ??
    input.permission_status
  const includesActive = !partial || (patch && patch.is_active !== undefined)
  if (includesActive) {
    if (finalPermissionStatus !== 'approved') {
      out.is_active = false
    } else {
      out.is_active = Boolean(input.is_active)
    }
  } else if (
    out.permission_status !== undefined &&
    finalPermissionStatus !== 'approved'
  ) {
    // Edge case: permission_status を approved 以外に変更した場合は
    // is_active を false に強制する。
    out.is_active = false
  }

  return { value: out }
}

/**
 * Allow a conservative subset of characters for ilike search.
 * Strips characters that would break Supabase `.or()` syntax (`,` `(` `)`)
 * or be SQL like-wildcards (`%`). Underscore stays — admin-only page,
 * acceptable to let one-char wildcard through.
 */
function sanitizeSearchTerm(raw: string): string {
  return raw.replace(/[%(),"]/g, '').trim().slice(0, 50)
}
