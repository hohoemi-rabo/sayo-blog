/**
 * ページ全体のスクショ (Edge の「Web キャプチャ → ページ全体」等) を、
 * AI に渡せる大きさの JPEG に縦分割する (ブラウザ専用)。
 *
 * 巨大な 1 枚の canvas は作らない (Safari は canvas の面積上限が小さい)。
 * 分割 1 枚ぶんの canvas に、元画像の該当範囲だけを描いて書き出す。
 */

import {
  SCREENSHOT_JPEG_QUALITY,
  SCREENSHOT_MAX_SLICES_PER_PAGE,
  SCREENSHOT_MAX_WIDTH,
  SCREENSHOT_SLICE_HEIGHT,
  SCREENSHOT_SLICE_OVERLAP,
} from '@/lib/page-screenshots'

export interface SlicedScreenshot {
  slices: string[]
  /** 長すぎて下の方を切り捨てたか */
  truncated: boolean
}

export async function sliceScreenshot(file: File): Promise<SlicedScreenshot> {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, SCREENSHOT_MAX_WIDTH / bitmap.width)
    const outWidth = Math.round(bitmap.width * scale)
    // 元画像の座標系での 1 枚の高さ・送り幅
    const srcSliceHeight = SCREENSHOT_SLICE_HEIGHT / scale
    const srcStep = (SCREENSHOT_SLICE_HEIGHT - SCREENSHOT_SLICE_OVERLAP) / scale

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('画像を処理できませんでした')

    const slices: string[] = []
    let top = 0
    let coveredBottom = 0
    while (top < bitmap.height && slices.length < SCREENSHOT_MAX_SLICES_PER_PAGE) {
      const srcHeight = Math.min(srcSliceHeight, bitmap.height - top)
      canvas.width = outWidth
      canvas.height = Math.round(srcHeight * scale)
      // 透過 PNG の背景が黒くならないよう白で塗る
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(bitmap, 0, top, bitmap.width, srcHeight, 0, 0, canvas.width, canvas.height)
      slices.push(await canvasToBase64Jpeg(canvas))
      coveredBottom = top + srcHeight
      if (coveredBottom >= bitmap.height) break
      top += srcStep
    }
    return { slices, truncated: coveredBottom < bitmap.height }
  } finally {
    bitmap.close()
  }
}

async function canvasToBase64Jpeg(canvas: HTMLCanvasElement): Promise<string> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', SCREENSHOT_JPEG_QUALITY)
  )
  if (!blob) throw new Error('画像を処理できませんでした')
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}
