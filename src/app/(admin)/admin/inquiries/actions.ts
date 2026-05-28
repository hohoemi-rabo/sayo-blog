'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase'
import { assertAdminAuth } from '@/lib/admin-auth'
import { uploadInquiryImages, InquiryImageError } from '@/lib/inquiry-images'
import {
  INQUIRY_IMAGE_ACCEPT,
  INQUIRY_IMAGE_MAX_BYTES,
} from '@/lib/inquiry-schema'
import type {
  MiniInquiry,
  LongInquiry,
  MiniInquiryStatus,
  LongInquiryStatus,
} from '@/lib/types'
import type { InquiryCounts, InquiryMutationResult } from './filters'

const ADMIN_INQUIRIES_PATH = '/admin/inquiries'

/** 記事化画面で追加アップロードできる画像の上限 */
const ADDITIONAL_IMAGE_MAX_COUNT = 8

/** タブの件数バッジ用に未対応 / 総数をまとめて取得 */
export async function getInquiryCounts(): Promise<InquiryCounts> {
  await assertAdminAuth()
  const supabase = createAdminClient()

  const [miniPending, longPending, miniTotal, longTotal] = await Promise.all([
    supabase
      .from('mini_inquiries')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('long_inquiries')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase.from('mini_inquiries').select('*', { count: 'exact', head: true }),
    supabase.from('long_inquiries').select('*', { count: 'exact', head: true }),
  ])

  return {
    miniPending: miniPending.count ?? 0,
    longPending: longPending.count ?? 0,
    miniTotal: miniTotal.count ?? 0,
    longTotal: longTotal.count ?? 0,
  }
}

export async function getMiniInquiries(): Promise<MiniInquiry[]> {
  await assertAdminAuth()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('mini_inquiries')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as MiniInquiry[]
}

export async function getLongInquiries(): Promise<LongInquiry[]> {
  await assertAdminAuth()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('long_inquiries')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as LongInquiry[]
}

/** ミニ記事依頼を 1 件取得 (記事化画面・詳細用) */
export async function getMiniInquiry(id: string): Promise<MiniInquiry | null> {
  await assertAdminAuth()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('mini_inquiries')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data as MiniInquiry | null) ?? null
}

/** ミニ記事依頼のステータスを更新 */
export async function updateMiniInquiryStatus(
  id: string,
  status: MiniInquiryStatus
): Promise<InquiryMutationResult> {
  try {
    await assertAdminAuth()
  } catch {
    return { ok: false, error: '認証が必要です' }
  }
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('mini_inquiries')
    .update({ status })
    .eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath(ADMIN_INQUIRIES_PATH)
  return { ok: true }
}

/** ミニ記事依頼の内部メモを更新 */
export async function updateMiniInquiryNotes(
  id: string,
  notes: string
): Promise<InquiryMutationResult> {
  try {
    await assertAdminAuth()
  } catch {
    return { ok: false, error: '認証が必要です' }
  }
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('mini_inquiries')
    .update({ admin_notes: notes.trim() === '' ? null : notes })
    .eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath(ADMIN_INQUIRIES_PATH)
  return { ok: true }
}

/** ミニ記事依頼を削除 (紐づく画像も inquiry-images から削除) */
export async function deleteMiniInquiry(
  id: string
): Promise<InquiryMutationResult> {
  try {
    await assertAdminAuth()
  } catch {
    return { ok: false, error: '認証が必要です' }
  }
  const supabase = createAdminClient()

  // 紐づく画像 (mini/{id}/*) をベストエフォートで削除
  try {
    const { data: files } = await supabase.storage
      .from('inquiry-images')
      .list(`mini/${id}`)
    if (files && files.length > 0) {
      await supabase.storage
        .from('inquiry-images')
        .remove(files.map((f) => `mini/${id}/${f.name}`))
    }
  } catch (err) {
    console.error('[deleteMiniInquiry] image cleanup failed:', err)
  }

  const { error } = await supabase.from('mini_inquiries').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath(ADMIN_INQUIRIES_PATH)
  return { ok: true }
}

/**
 * 記事化画面の追加画像を inquiry-images に保存して公開 URL を返す。
 * 管理は独自 cookie 認証 (Supabase auth ではない) のため client から直接
 * バケットへ書けない → service role の Server Action 経由でアップロードする。
 */
export async function uploadAdditionalInquiryImages(
  inquiryId: string,
  formData: FormData
): Promise<{ ok: true; urls: string[] } | { ok: false; error: string }> {
  try {
    await assertAdminAuth()
  } catch {
    return { ok: false, error: '認証が必要です' }
  }

  const files = formData
    .getAll('images')
    .filter((f): f is File => f instanceof File && f.size > 0)
  if (files.length === 0) return { ok: true, urls: [] }
  if (files.length > ADDITIONAL_IMAGE_MAX_COUNT) {
    return {
      ok: false,
      error: `追加画像は一度に最大 ${ADDITIONAL_IMAGE_MAX_COUNT} 枚までです`,
    }
  }
  for (const f of files) {
    if (!INQUIRY_IMAGE_ACCEPT.includes(f.type as (typeof INQUIRY_IMAGE_ACCEPT)[number])) {
      return { ok: false, error: '対応していない画像形式です（JPEG / PNG / WebP / HEIC のみ）' }
    }
    if (f.size > INQUIRY_IMAGE_MAX_BYTES) {
      return { ok: false, error: '画像は 1 枚あたり 10MB までです' }
    }
  }

  try {
    const urls = await uploadInquiryImages({
      inquiryId,
      files,
      // 複数回アップロードしても上書きしないよう一意なプレフィックス
      namePrefix: `additional_${Date.now()}_`,
    })
    return { ok: true, urls }
  } catch (err) {
    if (err instanceof InquiryImageError) {
      return { ok: false, error: err.message }
    }
    console.error('[uploadAdditionalInquiryImages] failed:', err)
    return { ok: false, error: '画像のアップロードに失敗しました' }
  }
}

// ============================================================
// ロング記事依頼 (Ticket 42) のミューテーション
// ============================================================

/** ロング記事依頼を 1 件取得 (詳細ダイアログ用) */
export async function getLongInquiry(id: string): Promise<LongInquiry | null> {
  await assertAdminAuth()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('long_inquiries')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data as LongInquiry | null) ?? null
}

export interface UpdateLongInquiryStatusOptions {
  scheduledAt?: string | null
  feeAmount?: number | null
}

/** ロング記事依頼のステータス更新 (取材日・金額を同時に更新可能) */
export async function updateLongInquiryStatus(
  id: string,
  status: LongInquiryStatus,
  options?: UpdateLongInquiryStatusOptions
): Promise<InquiryMutationResult> {
  try {
    await assertAdminAuth()
  } catch {
    return { ok: false, error: '認証が必要です' }
  }
  const supabase = createAdminClient()
  const patch: Record<string, unknown> = { status }
  if (options && 'scheduledAt' in options) {
    patch.scheduled_at = options.scheduledAt || null
  }
  if (options && 'feeAmount' in options) {
    patch.fee_amount = options.feeAmount ?? null
  }
  const { error } = await supabase
    .from('long_inquiries')
    .update(patch)
    .eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath(ADMIN_INQUIRIES_PATH)
  return { ok: true }
}

/** ロング記事依頼の内部メモを更新 */
export async function updateLongInquiryNotes(
  id: string,
  notes: string
): Promise<InquiryMutationResult> {
  try {
    await assertAdminAuth()
  } catch {
    return { ok: false, error: '認証が必要です' }
  }
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('long_inquiries')
    .update({ admin_notes: notes.trim() === '' ? null : notes })
    .eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath(ADMIN_INQUIRIES_PATH)
  return { ok: true }
}

/** ロング記事依頼を削除 (画像は無いので Storage 操作不要) */
export async function deleteLongInquiry(
  id: string
): Promise<InquiryMutationResult> {
  try {
    await assertAdminAuth()
  } catch {
    return { ok: false, error: '認証が必要です' }
  }
  const supabase = createAdminClient()
  const { error } = await supabase.from('long_inquiries').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath(ADMIN_INQUIRIES_PATH)
  return { ok: true }
}

/**
 * ロング記事依頼に既存記事を紐付ける。
 * - posts.article_type を 'long' にフリップ (mini の場合は不可)
 * - 紐付け先が既に公開済みなら inquiry.status='published' も同時更新
 */
export async function linkInquiryToPost(
  inquiryId: string,
  postId: string
): Promise<InquiryMutationResult> {
  try {
    await assertAdminAuth()
  } catch {
    return { ok: false, error: '認証が必要です' }
  }
  const supabase = createAdminClient()

  const { data: post, error: postErr } = await supabase
    .from('posts')
    .select('id, article_type, is_published')
    .eq('id', postId)
    .maybeSingle()
  if (postErr) return { ok: false, error: postErr.message }
  if (!post) return { ok: false, error: '指定された記事が見つかりません' }
  if (post.article_type === 'mini') {
    return {
      ok: false,
      error: 'ミニ記事はロング記事として紐付けできません',
    }
  }

  // 他の依頼に紐付いていないか確認
  const { data: occupied } = await supabase
    .from('long_inquiries')
    .select('id')
    .eq('generated_post_id', postId)
    .neq('id', inquiryId)
    .maybeSingle()
  if (occupied) {
    return { ok: false, error: 'この記事は別の依頼に紐付け済みです' }
  }

  if (post.article_type !== 'long') {
    const { error: flipErr } = await supabase
      .from('posts')
      .update({ article_type: 'long' })
      .eq('id', postId)
    if (flipErr) return { ok: false, error: flipErr.message }
  }

  const patch: Record<string, unknown> = { generated_post_id: postId }
  if (post.is_published) patch.status = 'published'
  const { error } = await supabase
    .from('long_inquiries')
    .update(patch)
    .eq('id', inquiryId)
  if (error) return { ok: false, error: error.message }

  revalidatePath(ADMIN_INQUIRIES_PATH)
  revalidatePath('/admin/posts')
  return { ok: true }
}

/** ロング記事依頼の紐付けを解除 (post.article_type はそのまま残す) */
export async function unlinkInquiryFromPost(
  inquiryId: string
): Promise<InquiryMutationResult> {
  try {
    await assertAdminAuth()
  } catch {
    return { ok: false, error: '認証が必要です' }
  }
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('long_inquiries')
    .update({ generated_post_id: null })
    .eq('id', inquiryId)
  if (error) return { ok: false, error: error.message }
  revalidatePath(ADMIN_INQUIRIES_PATH)
  return { ok: true }
}

/** 紐付け Select 用: 他依頼に紐付いていない free/long 記事の最新 50 件 */
export interface LinkablePost {
  id: string
  title: string
  is_published: boolean
  article_type: string
  created_at: string
}

export async function getLinkablePosts(): Promise<LinkablePost[]> {
  await assertAdminAuth()
  const supabase = createAdminClient()

  // 他の依頼に紐付いている post id を除外
  const { data: linked } = await supabase
    .from('long_inquiries')
    .select('generated_post_id')
    .not('generated_post_id', 'is', null)
  const occupied = new Set(
    ((linked ?? []) as Array<{ generated_post_id: string | null }>)
      .map((r) => r.generated_post_id)
      .filter((v): v is string => !!v)
  )

  const { data, error } = await supabase
    .from('posts')
    .select('id, title, is_published, article_type, created_at')
    .in('article_type', ['free', 'long'])
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw new Error(error.message)

  const rows = (data ?? []) as LinkablePost[]
  return rows.filter((p) => !occupied.has(p.id)).slice(0, 50)
}
