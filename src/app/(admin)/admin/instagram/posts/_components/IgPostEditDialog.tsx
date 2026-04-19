'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { ImageUploader } from '@/components/admin/ImageUploader'
import type { IgPostWithRelations } from '@/lib/types'
import { updateIgPost } from '../actions'

interface IgPostEditDialogProps {
  item: IgPostWithRelations | null
  onClose: () => void
  onSaved: () => void
  onError: (message: string) => void
}

export function IgPostEditDialog({
  item,
  onClose,
  onSaved,
  onError,
}: IgPostEditDialogProps) {
  const [caption, setCaption] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (item) {
      setCaption(item.caption)
      setImageUrl(item.image_url ?? null)
    }
  }, [item])

  const open = Boolean(item)

  const handleSave = () => {
    if (!item) return
    startTransition(async () => {
      const result = await updateIgPost(item.id, {
        caption,
        image_url: imageUrl,
      })
      if (result.success) onSaved()
      else onError(result.error)
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>下書きを編集</DialogTitle>
          <DialogDescription>
            下のテキストが Instagram にそのまま投稿されます。ハッシュタグも含めてここで編集してください。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div>
            <div className="mb-1 flex items-baseline justify-between">
              <label className="block text-sm font-medium">投稿テキスト</label>
              <span className="text-xs text-text-secondary">{caption.length} 文字</span>
            </div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={18}
              className="w-full rounded-md border border-border-decorative bg-background p-3 text-sm font-mono leading-relaxed"
              placeholder="#長野県飯田市 #sayosjournalブログ記事\n\n本文..."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">IG 投稿用画像（任意）</label>
            <p className="mb-2 text-xs text-text-secondary">
              未設定の場合は元記事のサムネイル画像を使用します。
            </p>
            <ImageUploader
              value={imageUrl}
              onChange={setImageUrl}
              bucket="ig-posts"
            />
          </div>
        </div>

        <DialogFooter className="pt-6">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            キャンセル
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
