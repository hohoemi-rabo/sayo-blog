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
import { generateIgPosts } from '../actions'

interface GenerateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  publishedPosts: Array<{ id: string; title: string; slug: string }>
  onGenerated: (count: number) => void
  onError: (message: string) => void
}

export function GenerateDialog({
  open,
  onOpenChange,
  publishedPosts,
  onGenerated,
  onError,
}: GenerateDialogProps) {
  const [postId, setPostId] = useState('')
  const [count, setCount] = useState(1)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (open) {
      setPostId('')
      setCount(1)
    }
  }, [open])

  const handleSubmit = () => {
    if (!postId) {
      onError('記事を選択してください')
      return
    }
    startTransition(async () => {
      const result = await generateIgPosts(postId, count)
      if (result.success) {
        onOpenChange(false)
        onGenerated(result.data?.length ?? count)
      } else {
        onError(result.error)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Instagram 下書きを生成</DialogTitle>
          <DialogDescription>
            記事を選んで件数を指定してください。公開済み記事のみが表示されます。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div>
            <label className="mb-1 block text-sm font-medium">記事</label>
            <select
              value={postId}
              onChange={(e) => setPostId(e.target.value)}
              className="h-10 w-full rounded-md border border-border-decorative bg-background px-3 text-sm"
            >
              <option value="">選択してください</option>
              {publishedPosts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">生成件数</label>
            <input
              type="number"
              min={1}
              max={5}
              value={count}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10)
                if (Number.isFinite(v) && v >= 1 && v <= 5) setCount(v)
              }}
              className="h-10 w-24 rounded-md border border-border-decorative bg-background px-3 text-sm"
            />
            <p className="mt-1 text-xs text-text-secondary">
              1〜5 件まで。複数件を選ぶと異なる切り口のキャプションが生成されます。
            </p>
          </div>
        </div>

        <DialogFooter className="pt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !postId}>
            {isPending ? '生成中...' : '生成する'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
