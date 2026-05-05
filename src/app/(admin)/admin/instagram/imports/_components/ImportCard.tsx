'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useTransition } from 'react'
import {
  ExternalLink,
  Heart,
  Images,
  MessageCircle,
  Pencil,
  Sparkles,
  SkipForward,
  Trash2,
  Undo2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type {
  IgImportedPostWithSource,
  IgImportedStatus,
} from '@/lib/types'
import { deleteImport, updateImportStatus } from '../actions'

interface ImportCardProps {
  item: IgImportedPostWithSource
  onGenerateClick: (item: IgImportedPostWithSource) => void
  onGalleryClick: (item: IgImportedPostWithSource) => void
  onMutated: (message: string) => void
  onError: (message: string) => void
}

const STATUS_STYLES: Record<
  IgImportedStatus,
  { label: string; className: string }
> = {
  pending: {
    label: '未処理',
    className: 'bg-amber-50 text-amber-700 border-amber-300',
  },
  processing: {
    label: '処理中',
    className: 'bg-blue-50 text-blue-700 border-blue-300',
  },
  published: {
    label: '公開済み',
    className: 'bg-green-50 text-green-700 border-green-300',
  },
  skipped: {
    label: 'スキップ',
    className: 'bg-gray-100 text-gray-600 border-gray-300',
  },
}

export function ImportCard({
  item,
  onGenerateClick,
  onGalleryClick,
  onMutated,
  onError,
}: ImportCardProps) {
  const [isPending, startTransition] = useTransition()

  const status = STATUS_STYLES[item.status]
  const images = item.stored_image_urls ?? []
  const thumbnail = images[0] ?? null
  const imageCount = images.length

  const handleStatusChange = (next: IgImportedStatus, message: string) => {
    startTransition(async () => {
      const result = await updateImportStatus(item.id, next)
      if (result.success) onMutated(message)
      else onError(result.error)
    })
  }

  const handleDelete = () => {
    if (!confirm('この取り込み投稿を削除しますか？\n（関連する画像も削除されます）'))
      return
    startTransition(async () => {
      const result = await deleteImport(item.id)
      if (result.success) onMutated('取り込み投稿を削除しました')
      else onError(result.error)
    })
  }

  const captionPreview = item.caption ?? '(キャプションなし)'
  const sourceLabel = item.source?.display_name ?? '(出典不明)'
  const usernameLabel = item.source?.ig_username
    ? `@${item.source.ig_username}`
    : ''
  const categorySlug = item.source?.category_slug ?? null

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-border-decorative bg-white shadow-sm">
      {/* Thumbnail */}
      <button
        type="button"
        onClick={() => onGalleryClick(item)}
        className="group relative aspect-[4/3] bg-background-dark/5"
        aria-label="画像ギャラリーを開く"
      >
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt=""
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-text-secondary">
            画像なし
          </div>
        )}

        {/* Status badge */}
        <span
          className={`absolute right-2 top-2 rounded-full border px-2 py-0.5 text-xs font-medium ${status.className}`}
        >
          {status.label}
        </span>

        {/* Carousel badge */}
        {imageCount > 1 && (
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-xs font-medium text-white">
            <Images className="h-3 w-3" />×{imageCount}
          </span>
        )}
      </button>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Source line */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-medium text-text-primary">{sourceLabel}</span>
          {usernameLabel && (
            <span className="text-text-secondary">{usernameLabel}</span>
          )}
          {categorySlug && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              {categorySlug}
            </span>
          )}
        </div>

        {/* Caption preview */}
        <p className="line-clamp-3 whitespace-pre-wrap text-sm text-text-primary">
          {captionPreview}
        </p>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
          {item.ig_posted_at && <span>{formatDate(item.ig_posted_at)}</span>}
          <span className="inline-flex items-center gap-1">
            <Heart className="h-3 w-3" />
            {item.likes_count ?? 0}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="h-3 w-3" />
            {item.comment_count ?? 0}
          </span>
          {item.ig_post_url && (
            <a
              href={item.ig_post_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
              title="元の Instagram 投稿を開く"
            >
              <ExternalLink className="h-3 w-3" />
              元投稿
            </a>
          )}
        </div>

        {/* Actions */}
        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          {item.status === 'pending' && (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onGenerateClick(item)}
                disabled={isPending || images.length === 0}
                title={
                  images.length === 0
                    ? '画像がないため記事化できません'
                    : '記事化する'
                }
                className="gap-1"
              >
                <Sparkles className="h-3.5 w-3.5" />
                記事化する
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleStatusChange('skipped', 'スキップに変更しました')
                }
                disabled={isPending}
                className="gap-1"
              >
                <SkipForward className="h-3.5 w-3.5" />
                スキップ
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
            </>
          )}

          {item.status === 'processing' && (
            <>
              {item.post && (
                <Link
                  href={`/admin/posts/${item.post.id}`}
                  className="inline-flex items-center justify-center gap-1 rounded-xl border border-border-decorative bg-background px-4 py-2 text-sm font-medium text-text-primary transition-all hover:bg-background-dark/5"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  生成中の記事を開く
                </Link>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleStatusChange('pending', '未処理に戻しました')
                }
                disabled={isPending}
                className="gap-1"
              >
                <Undo2 className="h-3.5 w-3.5" />
                未処理に戻す
              </Button>
            </>
          )}

          {item.status === 'published' && item.post && (
            <Link
              href={
                categorySlug
                  ? `/${categorySlug}/${item.post.slug}`
                  : `/admin/posts/${item.post.id}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1 rounded-xl border border-border-decorative bg-background px-4 py-2 text-sm font-medium text-text-primary transition-all hover:bg-background-dark/5"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              生成記事を見る
            </Link>
          )}

          {item.status === 'skipped' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleStatusChange('pending', '未処理に戻しました')
                }
                disabled={isPending}
                className="gap-1"
              >
                <Undo2 className="h-3.5 w-3.5" />
                未処理に戻す
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
            </>
          )}
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
