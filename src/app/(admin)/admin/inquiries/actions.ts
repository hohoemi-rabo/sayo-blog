'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase'
import { assertAdminAuth } from '@/lib/admin-auth'
import type {
  MiniInquiry,
  LongInquiry,
  MiniInquiryStatus,
} from '@/lib/types'
import type { InquiryCounts, InquiryMutationResult } from './filters'

const ADMIN_INQUIRIES_PATH = '/admin/inquiries'

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
