import { Cormorant_Garamond, Shippori_Mincho } from 'next/font/google'

/**
 * サイト本体と LP の両方で使う明朝系フォント (next/font で self-host)。
 *
 * もともと LP 専用 ((lp)/layout.tsx) で読んでいたものを、HOISA ロゴ・ヘッダー・ヒーローでも
 * 使うためにここへ集約した。ルートレイアウトで変数を付与し、LP 側は同じ変数を参照するだけにする
 * (同じフォントを 2 か所で宣言すると別ファイルとして二重に読み込まれるため)。
 */

// HOISA の欧文ロゴ・装飾見出し
export const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap',
})

// キャッチ・ヒーロー本文などの和文明朝
export const shippori = Shippori_Mincho({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-shippori',
  display: 'swap',
})
