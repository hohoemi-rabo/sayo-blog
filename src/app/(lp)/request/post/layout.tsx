import '../../lp-post.css'

/**
 * 投稿記事 LP のレイアウト。
 * スタイルはこのルート配下でのみ読み込み、`.lp-post` にスコープする。
 * (取材記事 LP はクラス名が同じでパレットだけ違うため、スコープを分けて衝突を防ぐ)
 */
export default function PostLpLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="lp-post">{children}</div>
}
