import { cache } from 'react'
import { createClient } from '@/lib/supabase'

export type NavCategory = { slug: string; name: string }

/**
 * ヘッダー「探す」とフッターに並べるカテゴリ (表示順)。
 * ハードコードしないのは、2026-10 の再編のように並びや名前が変わっても追従させるため。
 * React.cache で同じリクエスト内のヘッダー・フッターの呼び出しを 1 回にまとめる。
 */
export const getNavCategories = cache(async (): Promise<NavCategory[]> => {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('slug, name')
    .eq('is_active', true)
    .order('order_num')

  if (error) {
    // メニューのカテゴリが出ないだけで、ページ自体は表示させる
    console.error('Error fetching nav categories:', error)
    return []
  }
  return data ?? []
})
