'use client'

import { useMemo, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import type { IgPostWithRelations } from '@/lib/types'
import type { IgPostStatusFilter } from '../filters'
import { IgPostCard } from './IgPostCard'
import { IgPostEditDialog } from './IgPostEditDialog'
import { GenerateDialog } from './GenerateDialog'

interface IgPostsClientProps {
  initialItems: IgPostWithRelations[]
  totalCount: number
  filter: { status: IgPostStatusFilter; post_id?: string }
  publishedPosts: Array<{ id: string; title: string; slug: string }>
}

const STATUS_LABELS: Record<IgPostStatusFilter, string> = {
  all: 'すべて',
  draft: '下書き',
  published: '投稿済み',
  manual_published: '手動投稿済み',
}

export function IgPostsClient({
  initialItems,
  totalCount,
  filter,
  publishedPosts,
}: IgPostsClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { addToast } = useToast()

  const [editing, setEditing] = useState<IgPostWithRelations | null>(null)
  const [generateOpen, setGenerateOpen] = useState(false)

  const sequenceTotals = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of initialItems) {
      map.set(item.post_id, (map.get(item.post_id) ?? 0) + 1)
    }
    return map
  }, [initialItems])

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const handleGenerated = (count: number) => {
    addToast(`${count} 件の下書きを生成しました`, 'success')
    router.refresh()
  }

  const handleMutated = (message: string) => {
    addToast(message, 'success')
    router.refresh()
  }

  const handleError = (message: string) => {
    addToast(message, 'error', 5000)
  }

  return (
    <div className="space-y-4">
      {/* Filters + actions */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filter.status}
          onChange={(e) => updateFilter('status', e.target.value)}
          className="h-10 rounded-md border border-border-decorative bg-background px-3 py-2 text-sm"
          aria-label="ステータスフィルター"
        >
          {(['all', 'draft', 'published', 'manual_published'] as IgPostStatusFilter[]).map(
            (s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            )
          )}
        </select>

        <select
          value={filter.post_id ?? ''}
          onChange={(e) => updateFilter('post_id', e.target.value)}
          className="h-10 min-w-64 max-w-96 rounded-md border border-border-decorative bg-background px-3 py-2 text-sm"
          aria-label="記事フィルター"
        >
          <option value="">すべての記事</option>
          {publishedPosts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>

        <div className="ml-auto">
          <Button onClick={() => setGenerateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            追加生成
          </Button>
        </div>
      </div>

      {/* Card grid */}
      {initialItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-decorative py-12 text-center text-text-secondary">
          下書きがありません。「追加生成」から作成してください。
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {initialItems.map((item) => (
            <IgPostCard
              key={item.id}
              item={item}
              totalInSeries={sequenceTotals.get(item.post_id) ?? 1}
              onEdit={() => setEditing(item)}
              onMutated={handleMutated}
              onError={handleError}
            />
          ))}
        </div>
      )}

      {initialItems.length > 0 && initialItems.length < totalCount && (
        <p className="text-center text-xs text-text-secondary">
          {initialItems.length} / {totalCount} 件表示中（古いものを見る場合はフィルター調整）
        </p>
      )}

      {/* Dialogs */}
      <GenerateDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        publishedPosts={publishedPosts}
        onGenerated={handleGenerated}
        onError={handleError}
      />

      <IgPostEditDialog
        item={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null)
          handleMutated('下書きを更新しました')
        }}
        onError={handleError}
      />
    </div>
  )
}
