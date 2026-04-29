import { redirect } from 'next/navigation'

// Ticket 36 で取得投稿一覧画面を実装するまでの暫定リダイレクト。
// サイドバーの「取得投稿」リンクが 404 にならないよう /upload に飛ばす。
export default function ImportsRedirect() {
  redirect('/admin/instagram/imports/upload')
}
