'use client'

import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import type { IgImportedPostWithSource } from '@/lib/types'

interface ImportImageGalleryProps {
  item: IgImportedPostWithSource | null
  onClose: () => void
}

export function ImportImageGallery({ item, onClose }: ImportImageGalleryProps) {
  const open = item !== null
  const urls = item?.stored_image_urls ?? []

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-4xl flex-col p-0">
        <DialogHeader className="border-b border-border-decorative px-6 py-4">
          <DialogTitle>
            画像 {urls.length > 0 ? `(${urls.length} 枚)` : ''}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {urls.length === 0 ? (
            <p className="py-12 text-center text-sm text-text-secondary">
              画像が登録されていません
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {urls.map((url, idx) => (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative aspect-square overflow-hidden rounded border border-border-decorative bg-background-dark/5"
                  title={`${idx + 1} 枚目（クリックで原寸表示）`}
                >
                  <Image
                    src={url}
                    alt={`画像 ${idx + 1}`}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                    unoptimized
                  />
                  <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs font-medium text-white">
                    {idx + 1}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
