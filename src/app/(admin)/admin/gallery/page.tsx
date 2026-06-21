import { ImageIcon } from 'lucide-react'
import {
  getGalleryAdminImages,
  getGalleryAdminCounts,
  type GalleryAdminFilter,
} from './actions'
import GalleryAdminClient from './_components/GalleryAdminClient'

export const dynamic = 'force-dynamic'

const VALID_FILTERS: GalleryAdminFilter[] = ['all', 'visible', 'hidden', 'featured']

function parseFilter(value: string | undefined): GalleryAdminFilter {
  return VALID_FILTERS.includes(value as GalleryAdminFilter)
    ? (value as GalleryAdminFilter)
    : 'all'
}

export default async function AdminGalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { filter: filterParam } = await searchParams
  const filter = parseFilter(filterParam)

  const [{ images, error }, counts] = await Promise.all([
    getGalleryAdminImages(filter),
    getGalleryAdminCounts(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">ギャラリー管理</h1>
          <p className="mt-1 text-text-secondary">
            公開ギャラリーに出す写真の表示・ピン留めを整えます（アップロード・削除はしません）
          </p>
        </div>
        <div className="flex items-center gap-2 text-text-secondary">
          <ImageIcon className="h-5 w-5" />
          <span>{counts.all} 件</span>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">
          {error}
        </div>
      ) : (
        <GalleryAdminClient
          images={images}
          counts={counts}
          currentFilter={filter}
        />
      )}
    </div>
  )
}
