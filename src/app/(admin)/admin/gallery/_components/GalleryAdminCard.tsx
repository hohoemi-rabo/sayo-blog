'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Star, ExternalLink, Loader2 } from 'lucide-react'
import {
  toggleImageFeatured,
  toggleImageVisibility,
  type GalleryAdminImage,
} from '../actions'

interface GalleryAdminCardProps {
  image: GalleryAdminImage
}

/**
 * 管理ギャラリーの 1 枚カード。表示 ON/OFF とピン留めだけを操作する。
 * 楽観的更新: トグルを即座に反映し、失敗したら元に戻す。
 */
export default function GalleryAdminCard({ image }: GalleryAdminCardProps) {
  const [isVisible, setIsVisible] = useState(image.is_visible)
  const [isFeatured, setIsFeatured] = useState(image.is_featured)
  const [isPending, startTransition] = useTransition()

  const handleVisibility = () => {
    const next = !isVisible
    setIsVisible(next)
    startTransition(async () => {
      const res = await toggleImageVisibility(image.id, next)
      if (!res.success) setIsVisible(!next)
    })
  }

  const handleFeatured = () => {
    const next = !isFeatured
    setIsFeatured(next)
    startTransition(async () => {
      const res = await toggleImageFeatured(image.id, next)
      if (!res.success) setIsFeatured(!next)
    })
  }

  return (
    <div className="group overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="relative aspect-square bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.image_url}
          alt={image.alt ?? image.post_title}
          loading="lazy"
          decoding="async"
          className={`h-full w-full object-cover transition-opacity ${
            isVisible ? '' : 'opacity-40 grayscale'
          }`}
        />

        {/* 状態バッジ */}
        <div className="absolute left-1.5 top-1.5 flex flex-wrap gap-1">
          {!image.post_is_published && (
            <span className="rounded bg-gray-800/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
              下書き
            </span>
          )}
          {image.is_thumbnail && (
            <span className="rounded bg-primary/85 px-1.5 py-0.5 text-[10px] font-medium text-white">
              サムネ
            </span>
          )}
          {!isVisible && (
            <span className="rounded bg-red-600/85 px-1.5 py-0.5 text-[10px] font-medium text-white">
              非表示
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2 p-2.5">
        <Link
          href={`/admin/posts/${image.post_id}`}
          className="line-clamp-2 flex items-start gap-1 text-xs text-text-secondary hover:text-primary"
          title={image.post_title}
        >
          <span className="line-clamp-2">{image.post_title}</span>
          <ExternalLink className="mt-0.5 h-3 w-3 flex-shrink-0" />
        </Link>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleVisibility}
            disabled={isPending}
            className={`inline-flex flex-1 items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
              isVisible
                ? 'border-gray-300 text-text-secondary hover:bg-gray-50'
                : 'border-red-300 bg-red-50 text-red-600'
            }`}
          >
            {isVisible ? (
              <>
                <Eye className="h-3.5 w-3.5" /> 表示
              </>
            ) : (
              <>
                <EyeOff className="h-3.5 w-3.5" /> 非表示
              </>
            )}
          </button>

          <button
            onClick={handleFeatured}
            disabled={isPending}
            className={`inline-flex items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
              isFeatured
                ? 'border-amber-300 bg-amber-50 text-amber-600'
                : 'border-gray-300 text-text-secondary hover:bg-gray-50'
            }`}
            title={isFeatured ? 'ピン留め中' : 'ピン留めする'}
          >
            <Star className={`h-3.5 w-3.5 ${isFeatured ? 'fill-amber-400' : ''}`} />
          </button>

          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
        </div>
      </div>
    </div>
  )
}
