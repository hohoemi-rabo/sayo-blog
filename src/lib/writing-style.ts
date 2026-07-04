/**
 * 文体プロファイルのローダー。
 *
 * 正本は docs/writing-style-profile.md（紗代さん本人が読んで編集できる human-readable ドキュメント）。
 * ここでは runtime にそのファイルを読み込み、記事クラフトの生成プロンプトへ差し込む。
 * DRY のため TS 側に本文を複製せず、md を単一の情報源とする。
 *
 * - モジュール変数にキャッシュ（初回のみ読み込み）。
 * - Vercel のバンドルに含めるため next.config の outputFileTracingIncludes で明示。
 * - 万一ファイルが読めなくても生成が止まらないよう最小フォールバックを持つ。
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

let cached: string | null = null

/** ファイルが読めなかった場合の最小フォールバック（プロファイルの芯だけ） */
const FALLBACK_PROFILE = `# FUNE（本岡紗代）文体プロファイル（フォールバック）

- 一人称は「私」。ていねいな「です・ます」基調に、素の感想・小さな驚き・ユーモアがにじむ。
- 押しつけない。「〜してみてはいかがでしょうか」「よろしければ」とそっと背中を押す。
- 見聞きしたことは「〜だそう」「〜とのこと」と伝聞にして、確かめたことと切り分ける（誠実さ）。
- 単なる紹介で終わらせず、店・人の背景ストーリー（歴史・経歴・想い）まで掘り下げる。
- 段落は短く余白を多めに。体言止めや畳みかけ、豊かなオノマトメで五感を描く。
- h2 見出しは「■」付きで、引きのある言葉にする（h2 → 画像 → 文章の構造）。
- 書き出しは「こんにちは。地域情報発信ライターのFUNEです。」＋読者への問いかけフック。
- 締めは余韻で終え、定型あいさつ（最後までお読みいただき〜フォローしていただけたらうれしいです）。
- 末尾に基本情報ブロック（住所・電話・営業時間・定休日・駐車場 等）。
- 提供情報に無い体験・感想・会話・数値は捏造しない。足りない箇所は「※ここに実際の取材・体験の内容を加筆してください」を置く。`

/**
 * 文体プロファイル（Markdown 全文）を返す。生成プロンプトへそのまま差し込む。
 */
export function getWritingStyleProfile(): string {
  if (cached !== null) return cached
  try {
    cached = readFileSync(
      join(process.cwd(), 'docs', 'writing-style-profile.md'),
      'utf-8'
    ).trim()
  } catch (err) {
    console.warn(
      '[writing-style] docs/writing-style-profile.md を読み込めませんでした。フォールバックを使用します。',
      err instanceof Error ? err.message : err
    )
    cached = FALLBACK_PROFILE
  }
  return cached
}
