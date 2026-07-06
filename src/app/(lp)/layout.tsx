import {
  Cormorant_Garamond,
  Shippori_Mincho,
  Zen_Kaku_Gothic_New,
} from 'next/font/google'
import './lp-mini.css'

/**
 * LP 専用ルートグループのレイアウト。
 * サイト共通 Header / Footer は使わず、独立したチラシ型ページとして扱う。
 * (public) レイアウトの Header/Footer を回避するため別グループに分離している。
 * フォントは LP 独自 (明朝 + Cormorant + Zen Kaku) を next/font で self-host。
 */

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-lp-latin',
  display: 'swap',
})

const shippori = Shippori_Mincho({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-lp-serif',
  display: 'swap',
})

const zenKaku = Zen_Kaku_Gothic_New({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-lp-body',
  display: 'swap',
})

export default function LpLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`lp-root ${cormorant.variable} ${shippori.variable} ${zenKaku.variable}`}
    >
      {children}
    </div>
  )
}
