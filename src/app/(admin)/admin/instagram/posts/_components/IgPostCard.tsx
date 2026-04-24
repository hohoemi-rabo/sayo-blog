'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useTransition } from 'react'
import {
  Copy,
  Download,
  CheckCircle2,
  Pencil,
  Trash2,
  Send,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { IgPostStatus, IgPostWithRelations } from '@/lib/types'
import { deleteIgPost, markIgPostManualPublished } from '../actions'

interface IgPostCardProps {
  item: IgPostWithRelations
  totalInSeries: number
  onEdit: () => void
  onMutated: (message: string) => void
  onError: (message: string) => void
}

const STATUS_STYLES: Record<IgPostStatus, { label: string; className: string }> = {
  draft: {
    label: '下書き',
    className: 'bg-gray-100 text-gray-700 border-gray-300',
  },
  published: {
    label: '投稿済み',
    className: 'bg-green-50 text-green-700 border-green-300',
  },
  manual_published: {
    label: '手動投稿済み',
    className: 'bg-blue-50 text-blue-700 border-blue-300',
  },
}

export function IgPostCard({
  item,
  totalInSeries,
  onEdit,
  onMutated,
  onError,
}: IgPostCardProps) {
  const [isPending, startTransition] = useTransition()

  const status = STATUS_STYLES[item.status]
  const imageUrl = item.image_url ?? item.post?.thumbnail_url ?? null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(item.caption)
      onMutated('キャプションをコピーしました')
    } catch {
      onError('クリップボードへのコピーに失敗しました')
    }
  }

  const handleMarkManual = () => {
    if (item.status === 'manual_published') return
    startTransition(async () => {
      const result = await markIgPostManualPublished(item.id)
      if (result.success) onMutated('手動投稿済みに変更しました')
      else onError(result.error)
    })
  }

  const handleDelete = () => {
    if (!confirm('この下書きを削除しますか？')) return
    startTransition(async () => {
      const result = await deleteIgPost(item.id)
      if (result.success) onMutated('下書きを削除しました')
      else onError(result.error)
    })
  }

  const postUrl = item.post
    ? `/admin/posts/${item.post.id}`
    : null

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-border-decorative bg-white shadow-sm">
      {/* Image area */}
      <div className="relative aspect-[4/3] bg-background-dark/5">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt=""
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 25vw"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-text-secondary">
            画像なし
          </div>
        )}

        <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-1 text-xs font-medium text-white">
          {item.sequence_number} / {totalInSeries}
        </span>

        <span
          className={`absolute right-2 top-2 rounded-full border px-2 py-0.5 text-xs font-medium ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        {item.post && postUrl && (
          <Link
            href={postUrl}
            className="truncate text-xs font-medium text-primary hover:underline"
          >
            {item.post.title}
          </Link>
        )}

        <p className="line-clamp-4 whitespace-pre-wrap text-sm text-text-primary">
          {item.caption}
        </p>

        <p className="text-xs text-text-secondary">
          作成: {formatDate(item.created_at)}
          {item.instagram_published_at && (
            <> / 投稿: {formatDate(item.instagram_published_at)}</>
          )}
        </p>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-1"
          >
            <Copy className="h-3.5 w-3.5" />
            コピー
          </Button>
          {imageUrl && (
            <a
              href={imageUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1 rounded-xl border border-border-decorative bg-background px-4 py-2 text-sm font-medium text-text-primary transition-all hover:bg-background-dark/5"
            >
              <Download className="h-3.5 w-3.5" />
              画像
            </a>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkManual}
            disabled={isPending || item.status === 'manual_published'}
            className="gap-1"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            手動投稿済み
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="gap-1"
          >
            <Pencil className="h-3.5 w-3.5" />
            編集
          </Button>
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
          {/* Ticket 33 で実装予定 */}
          <Button
            variant="primary"
            size="sm"
            disabled
            title="Ticket 33 で実装予定"
            className="gap-1"
          >
            <Send className="h-3.5 w-3.5" />
            Instagram に投稿
          </Button>
        </div>
      </div>
    </article>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}
