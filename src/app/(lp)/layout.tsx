import type { CSSProperties } from 'react'
import { Zen_Kaku_Gothic_New } from 'next/font/google'

/**
 * LP 専用ルートグループのレイアウト。
 * サイト共通 Header / Footer は使わず、独立したチラシ型ページとして扱う。
 * (public) レイアウトの Header/Footer を回避するため別グループに分離している。
 *
 * ここでは **フォント変数の提供だけ** を行う。各 LP のスタイルは衝突を避けるため
 * ルートごとの layout で読み込む (投稿記事 = lp-post.css / .lp-post、
 * 取材記事 = lp-long.css / .lp-long)。両 LP はクラス名が同一 (.hero/.card/.btn 等) で
 * パレットだけ違うため、共通レイアウトで片方の CSS を読むと衝突する。
 *
 * 明朝系 (Cormorant / Shippori) はサイト本体と共有するためルートレイアウトで読み込み済み
 * (`src/lib/fonts.ts`)。LP の CSS が参照する `--font-lp-*` はここでその変数に橋渡しする。
 */

const zenKaku = Zen_Kaku_Gothic_New({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-lp-body',
  display: 'swap',
})

const LP_FONT_VARS = {
  '--font-lp-latin': 'var(--font-cormorant)',
  '--font-lp-serif': 'var(--font-shippori)',
} as CSSProperties

export default function LpLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={zenKaku.variable} style={LP_FONT_VARS}>
      {children}
    </div>
  )
}
