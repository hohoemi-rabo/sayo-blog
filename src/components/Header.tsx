import { cache } from 'react'
import { createClient } from '@/lib/supabase'
import HeaderClient, { type NavCategory } from './HeaderClient'

/**
 * 公開ヘッダー (Server)。「探す」メニューのカテゴリを DB から取り、表示は HeaderClient に任せる。
 * カテゴリをハードコードしないのは、2026-10 の再編のように並びや名前が変わっても追従させるため。
 * cookies() 等は読まない (読むと全公開ページが動的レンダリングに落ちる)。
 */
const getNavCategories = cache(async (): Promise<NavCategory[]> => {
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

export default async function Header() {
  const categories = await getNavCategories()
  return <HeaderClient categories={categories} />
}
