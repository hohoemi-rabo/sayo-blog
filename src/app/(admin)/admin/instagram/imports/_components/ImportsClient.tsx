'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import Pagination from '@/components/Pagination'
import type { IgImportedPostWithSource, IgSource } from '@/lib/types'
import {
  type IgImportedSort,
  type IgImportedStatusFilter,
  type ImportsFilter,
  IMPORTS_PAGE_SIZE,
} from '../filters'
import { ImportCard } from './ImportCard'
import { ImportImageGallery } from './ImportImageGallery'
import { ImageSelectorDialog } from './ImageSelectorDialog'
import { GenerateConfirmDialog } from './GenerateConfirmDialog'

interface ImportsClientProps {
  initialItems: IgImportedPostWithSource[]
  totalCount: number
  filter: ImportsFilter
  sources: IgSource[]
}

const STATUS_LABELS: Record<IgImportedStatusFilter, string> = {
  all: 'すべてのステータス',
  pending: '未処理',
  processing: '処理中',
  published: '公開済み',
  skipped: 'スキップ',
}

const SORT_LABELS: Record<IgImportedSort, string> = {
  latest: '最新順',
  likes: 'いいね数順',
}

export function ImportsClient({
  initialItems,
  totalCount,
  filter,
  sources,
}: ImportsClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { addToast } = useToast()

  const [galleryItem, setGalleryItem] = useState<IgImportedPostWithSource | null>(
    null
  )
  const [editingItem, setEditingItem] = useState<IgImportedPostWithSource | null>(
    null
  )
  const [confirmingItem, setConfirmingItem] =
    useState<IgImportedPostWithSource | null>(null)
  const [pendingIndexes, setPendingIndexes] = useState<number[]>([])

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') params.set(key, value)
    else params.delete(key)
    // Reset page when filter changes
    if (key !== 'page') params.delete('page')
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const q = String(formData.get('q') ?? '').trim()
    updateFilter('q', q)
  }

  const handleMutated = (message: string) => {
    addToast(message, 'success')
    router.refresh()
  }

  const handleError = (message: string) => {
    addToast(message, 'error', 5000)
  }

  const handleGenerateClick = (item: IgImportedPostWithSource) => {
    const images = item.stored_image_urls ?? []
    if (images.length === 0) {
      handleError('画像が登録されていないため記事化できません')
      return
    }
    if (images.length === 1) {
      // Single image: skip selector, go straight to confirm
      setPendingIndexes([0])
      setConfirmingItem(item)
    } else {
      setEditingItem(item)
    }
  }

  const handleSelectorConfirm = (indexes: number[]) => {
    if (!editingItem) return
    setPendingIndexes(indexes)
    setConfirmingItem(editingItem)
    setEditingItem(null)
  }

  const handleConfirmSuccess = (postId?: string) => {
    setConfirmingItem(null)
    setPendingIndexes([])
    if (postId) {
      router.push(`/admin/posts/${postId}`)
    } else {
      addToast(
        '記事化を開始しました（生成 API は Ticket 37 で接続予定）',
        'success'
      )
      router.refresh()
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / IMPORTS_PAGE_SIZE))

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filter.status}
          onChange={(e) => updateFilter('status', e.target.value)}
          className="h-10 rounded-md border border-border-decorative bg-background px-3 py-2 text-sm"
          aria-label="ステータスフィルター"
        >
          {(
            ['all', 'pending', 'processing', 'published', 'skipped'] as IgImportedStatusFilter[]
          ).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        <select
          value={filter.source_id ?? ''}
          onChange={(e) => updateFilter('source_id', e.target.value)}
          className="h-10 min-w-48 max-w-72 rounded-md border border-border-decorative bg-background px-3 py-2 text-sm"
          aria-label="アカウントフィルター"
        >
          <option value="">すべてのアカウント</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.display_name} (@{s.ig_username})
            </option>
          ))}
        </select>

        <select
          value={filter.sort}
          onChange={(e) => updateFilter('sort', e.target.value)}
          className="h-10 rounded-md border border-border-decorative bg-background px-3 py-2 text-sm"
          aria-label="並び順"
        >
          {(['latest', 'likes'] as IgImportedSort[]).map((s) => (
            <option key={s} value={s}>
              {SORT_LABELS[s]}
            </option>
          ))}
        </select>

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <input
            type="search"
            name="q"
            defaultValue={filter.q ?? ''}
            placeholder="キャプションを検索"
            className="h-10 w-56 rounded-md border border-border-decorative bg-background px-3 py-2 text-sm"
          />
          <Button type="submit" variant="outline" size="sm">
            検索
          </Button>
        </form>

        <div className="ml-auto">
          <Link
            href="/admin/instagram/imports/upload"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-white transition-all hover:bg-primary/90"
          >
            <Upload className="h-4 w-4" />
            新規取り込み
          </Link>
        </div>
      </div>

      {/* Grid */}
      {initialItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-decorative py-12 text-center text-text-secondary">
          条件に一致する取り込み投稿がありません。
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {initialItems.map((item) => (
            <ImportCard
              key={item.id}
              item={item}
              onGenerateClick={handleGenerateClick}
              onGalleryClick={(it) => setGalleryItem(it)}
              onMutated={handleMutated}
              onError={handleError}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={filter.page}
        totalPages={totalPages}
        totalItems={totalCount}
        itemsPerPage={IMPORTS_PAGE_SIZE}
      />

      {/* Dialogs */}
      <ImportImageGallery
        item={galleryItem}
        onClose={() => setGalleryItem(null)}
      />

      <ImageSelectorDialog
        open={editingItem !== null}
        imageUrls={editingItem?.stored_image_urls ?? []}
        initialIndexes={editingItem?.selected_image_indexes ?? null}
        onClose={() => setEditingItem(null)}
        onConfirm={handleSelectorConfirm}
      />

      <GenerateConfirmDialog
        item={confirmingItem}
        selectedIndexes={pendingIndexes}
        onClose={() => {
          setConfirmingItem(null)
          setPendingIndexes([])
        }}
        onSuccess={handleConfirmSuccess}
        onError={handleError}
      />
    </div>
  )
}
