'use client'

import { useEffect, useState } from 'react'

/**
 * Google Discover に大きな画像で載る条件 = 横 1200px 以上 (+ max-image-preview:large は設定済み)。
 * 小さい写真でも公開はできるので止めずに知らせるだけ。既存記事は直さなくてよい (紗代さんと合意)。
 */
const DISCOVER_MIN_WIDTH = 1200

type Size = { url: string; width: number; height: number }

export function ThumbnailSizeNotice({ url }: { url: string | null }) {
  const [size, setSize] = useState<Size | null>(null)

  useEffect(() => {
    if (!url) return
    let cancelled = false
    const img = new window.Image()
    img.onload = () => {
      if (!cancelled) setSize({ url, width: img.naturalWidth, height: img.naturalHeight })
    }
    // 読めないときは何も出さない (画像自体のエラーはアップローダーのプレビューで分かる)
    img.src = url
    return () => {
      cancelled = true
    }
  }, [url])

  // 画像を差し替えた直後に前の画像のサイズを出さない
  if (!url || !size || size.url !== url) return null

  const sizeLabel = `横 ${size.width} × 縦 ${size.height}px`

  if (size.width >= DISCOVER_MIN_WIDTH) {
    return <p className="mt-2 text-xs text-text-secondary">{sizeLabel}</p>
  }

  return (
    <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
      {sizeLabel}。Google の検索や Discover で大きく表示されるには、横 {DISCOVER_MIN_WIDTH}px
      以上の写真がおすすめです (このままでも公開はできます)。
    </p>
  )
}
