import '../../lp-long.css'

/**
 * 取材記事 LP のレイアウト。
 * スタイルはこのルート配下でのみ読み込み、`.lp-long` にスコープする。
 * (投稿記事 LP はクラス名が同じでパレットだけ違うため、スコープを分けて衝突を防ぐ)
 */
export default function LongLpLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="lp-long">{children}</div>
}
