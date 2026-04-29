'use client'

import { useTransition } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import type { IgPermissionStatus, IgSource } from '@/lib/types'
import {
  deleteIgSource,
  getRelatedImportedCount,
  updateIgSource,
} from '../actions'
import { CoworkPromptDownloadButton } from './CoworkPromptDownloadButton'

interface SourceRowProps {
  item: IgSource
  onEdit: () => void
  onMutated: (message: string) => void
  onError: (message: string) => void
}

const PERMISSION_BADGE: Record<
  IgPermissionStatus,
  { label: string; className: string }
> = {
  not_requested: {
    label: '未依頼',
    className: 'bg-gray-100 text-gray-700 border-gray-300',
  },
  requested: {
    label: '依頼中',
    className: 'bg-yellow-50 text-yellow-700 border-yellow-300',
  },
  approved: {
    label: '許可済み',
    className: 'bg-green-50 text-green-700 border-green-300',
  },
  denied: {
    label: '拒否',
    className: 'bg-red-50 text-red-700 border-red-300',
  },
}

export function SourceRow({
  item,
  onEdit,
  onMutated,
  onError,
}: SourceRowProps) {
  const [isPending, startTransition] = useTransition()

  const badge = PERMISSION_BADGE[item.permission_status]
  const activeToggleDisabled =
    isPending || item.permission_status !== 'approved'

  const handleToggleActive = (next: boolean) => {
    if (item.permission_status !== 'approved') return
    startTransition(async () => {
      const result = await updateIgSource(item.id, { is_active: next })
      if (result.success) {
        onMutated(next ? '取得を有効にしました' : '取得を無効にしました')
      } else {
        onError(result.error)
      }
    })
  }

  const handleDelete = async () => {
    const count = await getRelatedImportedCount(item.id)
    const message =
      count > 0
        ? `このアカウント @${item.ig_username} を削除します。\n紐づく取得投稿 ${count} 件も同時に削除されます。よろしいですか？`
        : `このアカウント @${item.ig_username} を削除しますか？`
    if (!confirm(message)) return

    startTransition(async () => {
      const result = await deleteIgSource(item.id)
      if (result.success) onMutated('アカウントを削除しました')
      else onError(result.error)
    })
  }

  return (
    <tr className="border-t border-border-decorative">
      <td className="px-4 py-3 align-top">
        <div className="font-medium text-text-primary">{item.display_name}</div>
        <div className="text-xs text-text-secondary">@{item.ig_username}</div>
      </td>
      <td className="px-4 py-3 align-top">
        {item.category_slug ? (
          <span className="inline-flex items-center rounded-full border border-border-decorative bg-background-dark/5 px-2 py-0.5 text-xs">
            {item.category_slug}
          </span>
        ) : (
          <span className="text-xs text-text-secondary">—</span>
        )}
      </td>
      <td className="px-4 py-3 align-top">
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${badge.className}`}
        >
          {badge.label}
        </span>
      </td>
      <td className="px-4 py-3 align-top text-xs text-text-secondary">
        {item.permission_date ?? '—'}
      </td>
      <td className="px-4 py-3 align-top">
        <div className="flex items-center gap-2">
          <Checkbox
            id={`active-${item.id}`}
            checked={item.is_active}
            onCheckedChange={handleToggleActive}
            disabled={activeToggleDisabled}
          />
          <label
            htmlFor={`active-${item.id}`}
            className={`text-xs ${
              activeToggleDisabled ? 'text-text-secondary' : 'text-text-primary'
            } cursor-pointer`}
          >
            {item.is_active ? '有効' : '無効'}
          </label>
        </div>
      </td>
      <td className="px-4 py-3 align-top text-xs text-text-secondary">
        {formatRelative(item.last_fetched_at)}
      </td>
      <td className="px-4 py-3 align-top">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="gap-1"
          >
            <Pencil className="h-3.5 w-3.5" />
            編集
          </Button>
          <CoworkPromptDownloadButton source={item} />
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={isPending}
            className="gap-1 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            削除
          </Button>
        </div>
      </td>
    </tr>
  )
}

function formatRelative(iso: string | null): string {
  if (!iso) return '未取得'
  const date = new Date(iso)
  const diffMs = date.getTime() - Date.now()
  const absSeconds = Math.abs(diffMs) / 1000

  const fmt = new Intl.RelativeTimeFormat('ja-JP', { numeric: 'auto' })
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['week', 60 * 60 * 24 * 7],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
  ]
  for (const [unit, seconds] of units) {
    if (absSeconds >= seconds) {
      const value = Math.round(diffMs / 1000 / seconds)
      return fmt.format(value, unit)
    }
  }
  return fmt.format(Math.round(diffMs / 1000), 'second')
}
