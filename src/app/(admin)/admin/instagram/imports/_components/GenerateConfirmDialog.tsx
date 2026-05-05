'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import type { IgImportedPostWithSource } from '@/lib/types'
import { startGenerateArticle } from '../actions'

interface GenerateConfirmDialogProps {
  item: IgImportedPostWithSource | null
  selectedIndexes: number[]
  onClose: () => void
  onSuccess: (postId?: string) => void
  onError: (message: string) => void
}

export function GenerateConfirmDialog({
  item,
  selectedIndexes,
  onClose,
  onSuccess,
  onError,
}: GenerateConfirmDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const open = item !== null

  if (!item) return null

  const captionPreview =
    item.caption && item.caption.length > 120
      ? item.caption.slice(0, 120) + '…'
      : (item.caption ?? '(キャプションなし)')

  const handleConfirm = async () => {
    setIsSubmitting(true)
    const result = await startGenerateArticle(item.id, selectedIndexes)
    setIsSubmitting(false)
    if (result.success) {
      onSuccess(result.data?.post_id)
    } else {
      onError(result.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isSubmitting && onClose()}>
      <DialogContent className="w-[95vw] max-w-lg">
        <DialogHeader>
          <DialogTitle>この投稿から記事を生成します</DialogTitle>
          <DialogDescription>
            選択した {selectedIndexes.length} 枚の画像で AI 記事を生成します。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="rounded border border-border-decorative bg-background-dark/5 p-3">
            <p className="text-xs font-medium text-text-secondary">
              キャプション先頭
            </p>
            <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-text-primary">
              {captionPreview}
            </p>
          </div>
          <p className="text-xs text-text-secondary">
            ※ 生成 API 本体は Ticket 37 で接続予定です。
            現在は status を「処理中」に変更するところまで実行されます。
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            キャンセル
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? '実行中…' : '記事化を開始'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
