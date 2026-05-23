'use server'

import { createAdminClient } from '@/lib/supabase'
import { assertAdminAuth } from '@/lib/admin-auth'
import type { MiniInquiry, LongInquiry } from '@/lib/types'
import type { InquiryCounts } from './filters'

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
