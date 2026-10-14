import { Cormorant_Garamond } from 'next/font/google'
import localFont from 'next/font/local'

/**
 * HOISA ブランド用フォント (ルートレイアウトで変数を付与)。
 *
 * 和文 (明朝・手書き風) は **使う文字だけのサブセット** を next/font/local で読む。
 * next/font/google で和文をサイト全体に読むと、表示した文字の分だけ unicode-range の分割ファイルを
 * 何十本も落とし (トップで 13MB / 482 リクエスト)、@font-face 宣言だけで描画ブロックの CSS も
 * 数百 KB 増えたため。サブセットは `npm run fonts:subset` (scripts/build-font-subsets.mjs) で作る。
 *
 * ⚠️ そのため font-mincho / font-hand は **固定の文言だけ** に使うこと (キャッチ・ヒーロー説明文など)。
 * 記事タイトル等の可変テキストは Noto Serif JP (font-noto-serif-jp) を使う。
 * サブセットに無い文字は Noto Serif JP にフォールバックする (崩れはしないが書体が混ざる)。
 *
 * LP は Shippori Mincho を広い文言・多数のウェイトで使うので、LP 側 ((lp)/layout.tsx) で
 * 従来どおり Google から読む (LP のページでしか読み込まれない)。
 */

// HOISA の欧文ロゴ。欧文のみなので Google から (LP も同じ変数を参照する)
export const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap',
})

// キャッチ・ヒーロー説明文などの和文明朝 (Shippori Mincho 400 のサブセット)
export const hoisaMincho = localFont({
  src: '../fonts/shippori-mincho-400-subset.woff2',
  weight: '400',
  variable: '--font-hoisa-mincho',
  display: 'swap',
})

// ヒーロー右上の手書き風ひとこと (Klee One 400 のサブセット、14 文字)
export const klee = localFont({
  src: '../fonts/klee-one-400-subset.woff2',
  weight: '400',
  variable: '--font-klee',
  display: 'swap',
  preload: false,
})
