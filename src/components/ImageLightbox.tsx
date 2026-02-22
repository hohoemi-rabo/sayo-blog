'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface LightboxImage {
  src: string
  alt: string
  caption?: string
}

export default function ImageLightbox() {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [images, setImages] = useState<LightboxImage[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const touchStartX = useRef<number>(0)

  // 記事内の画像を収集し、クリックイベントをデリゲート
  useEffect(() => {
    const articleBody = document.querySelector('.article-body')
    if (!articleBody) return

    const imgElements = articleBody.querySelectorAll('img')
    const collectedImages: LightboxImage[] = []

    imgElements.forEach((img) => {
      const figure = img.closest('figure')
      const caption = figure?.querySelector('figcaption')?.textContent || undefined

      collectedImages.push({
        src: img.src,
        alt: img.alt || '',
        caption,
      })
    })

    setImages(collectedImages)

    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'IMG') {
        const imgSrc = (target as HTMLImageElement).src
        const index = collectedImages.findIndex((img) => img.src === imgSrc)
        if (index !== -1) {
          setCurrentIndex(index)
          dialogRef.current?.showModal()
        }
      }
    }

    articleBody.addEventListener('click', handleClick)
    return () => articleBody.removeEventListener('click', handleClick)
  }, [])

  const close = useCallback(() => {
    dialogRef.current?.close()
  }, [])

  const prev = useCallback(() => {
    setCurrentIndex((i) => (i > 0 ? i - 1 : images.length - 1))
  }, [images.length])

  const next = useCallback(() => {
    setCurrentIndex((i) => (i < images.length - 1 ? i + 1 : 0))
  }, [images.length])

  // キーボードナビゲーション
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!dialogRef.current?.open) return
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [prev, next])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
      if (diff > 0) next()
      else prev()
    }
  }

  const current = images[currentIndex]

  return (
    <dialog
      ref={dialogRef}
      className="lightbox-dialog fixed inset-0 m-0 w-full h-full max-w-none max-h-none bg-transparent p-0 border-none outline-none"
      onClick={(e) => {
        if (e.target === dialogRef.current) close()
      }}
    >
      <div
        className="relative flex items-center justify-center w-full h-full"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* 閉じるボタン */}
        <button
          onClick={close}
          className="absolute top-4 right-4 z-10 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-full w-10 h-10 flex items-center justify-center transition-colors"
          aria-label="閉じる"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 前後ナビゲーション */}
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-4 z-10 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-full w-10 h-10 flex items-center justify-center transition-colors"
              aria-label="前の画像"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={next}
              className="absolute right-4 z-10 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-full w-10 h-10 flex items-center justify-center transition-colors"
              aria-label="次の画像"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* 画像 */}
        {current && (
          <div className="flex flex-col items-center max-w-[90vw] max-h-[90vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.src}
              alt={current.alt}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            {current.caption && (
              <p className="mt-3 text-white/80 text-sm text-center font-noto-sans-jp">
                {current.caption}
              </p>
            )}
            {images.length > 1 && (
              <p className="mt-1 text-white/50 text-xs font-noto-sans-jp">
                {currentIndex + 1} / {images.length}
              </p>
            )}
          </div>
        )}
      </div>
    </dialog>
  )
}
