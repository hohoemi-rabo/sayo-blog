/**
 * 記事クラフト（チラシ/メモ→記事）の入力制約。
 * クライアント（ファイル選択のフィルタ）と API（サーバ側検証）で共有する。
 *
 * チラシは「読み取り専用」で Gemini vision に渡すだけ（記事本文には載せない）。
 * 画像に加え PDF も可（Gemini はドキュメント理解に対応）。
 */

export const CRAFT_ACCEPT_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const

export type CraftAcceptMime = (typeof CRAFT_ACCEPT_MIME)[number]

export const CRAFT_ACCEPT_ATTR = CRAFT_ACCEPT_MIME.join(',')

/** 1 ファイルあたりの上限（10MB。情報窓口フォームの添付画像と揃える） */
export const CRAFT_MAX_BYTES = 10 * 1024 * 1024

/** 一度に読み取れるチラシ枚数の上限 */
export const CRAFT_MAX_FILES = 4

export function isCraftAcceptMime(mime: string): mime is CraftAcceptMime {
  return (CRAFT_ACCEPT_MIME as readonly string[]).includes(mime)
}
