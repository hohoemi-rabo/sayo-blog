'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import type { IgPermissionStatus, IgSource } from '@/lib/types'
import type { CategoryOption } from '../actions'
import type { IgActiveFilter, IgPermissionFilter } from '../filters'
import { SourceRow } from './SourceRow'
import { SourceDialog, type SourceDialogState } from './SourceDialog'

interface SourcesClientProps {
  initialItems: IgSource[]
  totalCount: number
  filter: {
    permission_status: IgPermissionFilter
    is_active: IgActiveFilter
    category_slug: string
    q: string
  }
  categories: CategoryOption[]
}

const PERMISSION_LABELS: Record<IgPermissionFilter, string> = {
  all: 'すべての許可状態',
  not_requested: '未依頼',
  requested: '依頼中',
  approved: '許可済み',
  denied: '拒否',
}

const ACTIVE_LABELS: Record<IgActiveFilter, string> = {
  all: '取得設定すべて',
  active: '有効のみ',
  inactive: '無効のみ',
}

export function SourcesClient({
  initialItems,
  totalCount,
  filter,
  categories,
}: SourcesClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { addToast } = useToast()

  const [dialogState, setDialogState] = useState<SourceDialogState>({
    mode: 'closed',
  })

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') params.set(key, value)
    else params.delete(key)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const q = String(formData.get('q') ?? '').trim()
    updateFilter('q', q)
  }

  const handleSaved = (message: string) => {
    addToast(message, 'success')
    setDialogState({ mode: 'closed' })
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
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filter.permission_status}
          onChange={(e) => updateFilter('permission_status', e.target.value)}
          className="h-10 rounded-md border border-border-decorative bg-background px-3 py-2 text-sm"
          aria-label="許可状態フィルター"
        >
          {(
            ['all', 'not_requested', 'requested', 'approved', 'denied'] as IgPermissionFilter[]
          ).map((s) => (
            <option key={s} value={s}>
              {PERMISSION_LABELS[s]}
            </option>
          ))}
        </select>

        <select
          value={filter.is_active}
          onChange={(e) => updateFilter('is_active', e.target.value)}
          className="h-10 rounded-md border border-border-decorative bg-background px-3 py-2 text-sm"
          aria-label="取得設定フィルター"
        >
          {(['all', 'active', 'inactive'] as IgActiveFilter[]).map((s) => (
            <option key={s} value={s}>
              {ACTIVE_LABELS[s]}
            </option>
          ))}
        </select>

        <select
          value={filter.category_slug}
          onChange={(e) => updateFilter('category_slug', e.target.value)}
          className="h-10 min-w-40 rounded-md border border-border-decorative bg-background px-3 py-2 text-sm"
          aria-label="カテゴリフィルター"
        >
          <option value="">すべてのカテゴリ</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <input
            type="search"
            name="q"
            defaultValue={filter.q}
            placeholder="表示名 / @ユーザー名で検索"
            className="h-10 w-64 rounded-md border border-border-decorative bg-background px-3 py-2 text-sm"
          />
          <Button type="submit" variant="outline" size="sm">
            検索
          </Button>
        </form>

        <div className="ml-auto">
          <Button
            onClick={() => setDialogState({ mode: 'create' })}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            新規登録
          </Button>
        </div>
      </div>

      {/* Table */}
      {initialItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-decorative py-12 text-center text-text-secondary">
          条件に一致するアカウントがありません。
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border-decorative bg-white">
          <table className="w-full text-sm">
            <thead className="bg-background-dark/5 text-left text-xs text-text-secondary">
              <tr>
                <th className="px-4 py-3 font-medium">表示名 / @ユーザー名</th>
                <th className="px-4 py-3 font-medium">カテゴリ</th>
                <th className="px-4 py-3 font-medium">許可状態</th>
                <th className="px-4 py-3 font-medium">許可日</th>
                <th className="px-4 py-3 font-medium">取得設定</th>
                <th className="px-4 py-3 font-medium">最終取得</th>
                <th className="px-4 py-3 font-medium">アクション</th>
              </tr>
            </thead>
            <tbody>
              {initialItems.map((item) => (
                <SourceRow
                  key={item.id}
                  item={item}
                  onEdit={() => setDialogState({ mode: 'edit', source: item })}
                  onMutated={handleMutated}
                  onError={handleError}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {initialItems.length > 0 && initialItems.length < totalCount && (
        <p className="text-center text-xs text-text-secondary">
          {initialItems.length} / {totalCount} 件表示中
        </p>
      )}

      {/* Dialog */}
      <SourceDialog
        state={dialogState}
        categories={categories}
        permissionLabels={
          {
            not_requested: '未依頼',
            requested: '依頼中',
            approved: '許可済み',
            denied: '拒否',
          } satisfies Record<IgPermissionStatus, string>
        }
        onClose={() => setDialogState({ mode: 'closed' })}
        onSaved={handleSaved}
        onError={handleError}
      />
    </div>
  )
}
