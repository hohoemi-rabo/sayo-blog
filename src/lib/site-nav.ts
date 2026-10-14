/**
 * 公開ヘッダー・フッター共通のメニュー定義。
 * Server (Footer) と Client (HeaderClient) の両方から読むので、'use client' のファイルには置かない
 * ('use client' モジュールの値は Server Component からは参照オブジェクトに化けて使えない)。
 */

export type NavItem = { href: string; label: string; description?: string }

export const READ_ITEMS: NavItem[] = [
  { href: '/blog', label: '新着の記事', description: 'いちばん新しい記事から' },
  { href: '/blog?sort=popular', label: 'よく読まれている記事', description: '人気の記事から' },
  { href: '/gallery', label: '写真から探す', description: 'ギャラリーで写真を眺める' },
]

// 「情報を届ける」の 2 択 (仮)。取材記事は有料の窓口なのでヘッダーから外さない
export const SEND_ITEMS: NavItem[] = [
  {
    href: '/request/post',
    label: '投稿記事で届ける',
    description: 'SNS の投稿やチラシから、無料で記事に',
  },
  {
    href: '/request/interview',
    label: '取材を依頼する',
    description: '取材して、じっくり記事にします',
  },
]

export const AI_ITEM = { href: '/chat', label: 'AIで探す' }
