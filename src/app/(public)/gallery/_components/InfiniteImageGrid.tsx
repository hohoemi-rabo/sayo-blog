'use client'

import { useCallback, useState } from 'react'
import { Loader2, ChevronDown } from 'lucide-react'
import { GALLERY_PAGE_SIZE, type GalleryImage } from '@/lib/gallery'
import GalleryTile from './GalleryTile'

interface InfiniteImageGridProps {
  initialImages: GalleryImage[]
  initialHasMore: boolean
  /** この訪問のランダム並びを固定するシード。初回ページと同じ並びで追加読込するため必須。 */
  seed: string
}

/**
 * 公開ギャラリーの masonry グリッド + 「もっと見る」追加読込。
 * 既存 `InfinitePostGrid` を踏襲 (CSS columns masonry / framer-motion 不使用)。
 */
export default function InfiniteImageGrid({
  initialImages,
  initialHasMore,
  seed,
}: InfiniteImageGridProps) {
  const [images, setImages] = useState<GalleryImage[]>(initialImages)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [isLoading, setIsLoading] = useState(false)

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return
    setIsLoading(true)

    try {
      const params = new URLSearchParams({
        offset: String(images.length),
        limit: String(GALLERY_PAGE_SIZE),
        seed,
      })
      const res = await fetch(`/api/gallery?${params.toString()}`)
      const data = await res.json()

      if (Array.isArray(data.images) && data.images.length > 0) {
        setImages((prev) => [...prev, ...data.images])
        setHasMore(Boolean(data.hasMore))
      } else {
        setHasMore(false)
      }
    } catch (error) {
      console.error('Failed to load more gallery images:', error)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, hasMore, images.length, seed])

  if (images.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="font-noto-serif-jp text-lg text-text-secondary">
          まだ写真がありません
        </p>
        <p className="mt-2 text-sm text-text-secondary">
          記事が公開されると、ここに写真が並びます
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="columns-2 gap-4 sm:columns-3 lg:columns-4">
        {images.map((image, index) => (
          <GalleryTile
            key={`${image.slug}-${image.image_url}`}
            image={image}
            delayMs={(index % GALLERY_PAGE_SIZE) * 30}
          />
        ))}
      </div>

      <div className="flex justify-center py-10">
        {hasMore ? (
          <button
            onClick={loadMore}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-full border border-primary px-6 py-3 font-noto-sans-jp text-primary transition-colors duration-200 hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                読み込み中...
              </>
            ) : (
              <>
                もっと見る
                <ChevronDown className="h-4 w-4" />
              </>
            )}
          </button>
        ) : (
          images.length > GALLERY_PAGE_SIZE && (
            <p className="text-sm text-text-secondary">すべての写真を表示しました</p>
          )
        )}
      </div>
    </div>
  )
}
