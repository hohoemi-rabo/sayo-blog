'use client'

import Link from 'next/link'
import GalleryAdminCard from './GalleryAdminCard'
import type { GalleryAdminFilter, GalleryAdminImage } from '../actions'

interface GalleryAdminClientProps {
  images: GalleryAdminImage[]
  counts: { all: number; visible: number; hidden: number; featured: number }
  currentFilter: GalleryAdminFilter
}

const TABS: { key: GalleryAdminFilter; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'visible', label: '表示中' },
  { key: 'hidden', label: '非表示' },
  { key: 'featured', label: 'ピン留め' },
]

export default function GalleryAdminClient({
  images,
  counts,
  currentFilter,
}: GalleryAdminClientProps) {
  return (
    <div className="space-y-5">
      {/* フィルタタブ */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const active = tab.key === currentFilter
          const count = counts[tab.key]
          return (
            <Link
              key={tab.key}
              href={tab.key === 'all' ? '/admin/gallery' : `/admin/gallery?filter=${tab.key}`}
              scroll={false}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary text-white'
                  : 'border border-gray-300 text-text-secondary hover:bg-gray-50'
              }`}
            >
              {tab.label}
              <span
                className={`rounded-full px-1.5 text-xs ${
                  active ? 'bg-white/25' : 'bg-gray-100'
                }`}
              >
                {count}
              </span>
            </Link>
          )
        })}
      </div>

      {images.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-16 text-center text-text-secondary">
          該当する画像がありません
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {images.map((image) => (
            <GalleryAdminCard key={image.id} image={image} />
          ))}
        </div>
      )}
    </div>
  )
}
