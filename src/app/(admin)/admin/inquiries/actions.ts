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
