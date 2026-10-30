/**
 * 記事化画面の「読めなかったページのスクショ」の決まりごと (Client / Server 両用)。
 *
 * スクショは AI に読ませるだけで保存しない (Storage にも DB にも残さない)。
 * 生成 API の JSON にそのまま載せて送るため、Vercel の本文上限 (4.5MB) に収まるよう
 * ブラウザ側で縦に分割 + JPEG 圧縮してから送る (screenshot-slicer.ts)。
 */

/** 分割後 1 枚の高さ。縦長のまま渡すと AI 側で縮小されて小さな文字が潰れるため */
export const SCREENSHOT_SLICE_HEIGHT = 2000
/** 上下の重なり。分割の境目で行が切れても、どちらかの画像で読めるように */
export const SCREENSHOT_SLICE_OVERLAP = 120
/** 横幅の上限。高解像度の画面で撮ると 2,000px を超えるので、文字が読める範囲で縮める */
export const SCREENSHOT_MAX_WIDTH = 1600
export const SCREENSHOT_JPEG_QUALITY = 0.82

/** 1 ページあたりの分割枚数の上限 (= 約 2 万 px。これより長いページは下を切る) */
export const SCREENSHOT_MAX_SLICES_PER_PAGE = 10
/** 送信全体の上限 (base64 の文字数)。4.5MB からテキスト分の余裕を引いた値 */
export const SCREENSHOT_MAX_TOTAL_BASE64 = 3_800_000

export interface PageScreenshot {
  /** どの URL のスクショか (依頼の sns_urls のいずれか) */
  url: string
  /** 上から順の分割画像 (JPEG, data URI プレフィックスなしの base64) */
  slices: string[]
}

export function totalScreenshotBase64Length(screenshots: PageScreenshot[]): number {
  return screenshots.reduce(
    (sum, s) => sum + s.slices.reduce((n, b) => n + b.length, 0),
    0
  )
}
