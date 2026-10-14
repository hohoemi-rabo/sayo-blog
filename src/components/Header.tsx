import { getNavCategories } from '@/lib/nav-categories'
import HeaderClient from './HeaderClient'

/**
 * 公開ヘッダー (Server)。「探す」メニューのカテゴリを DB から取り、表示は HeaderClient に任せる。
 * cookies() 等は読まない (読むと全公開ページが動的レンダリングに落ちる)。
 */
export default async function Header() {
  const categories = await getNavCategories()
  return <HeaderClient categories={categories} />
}
