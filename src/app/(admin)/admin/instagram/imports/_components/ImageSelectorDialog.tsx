'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'

interface ImageSelectorDialogProps {
  open: boolean
  imageUrls: string[]
  initialIndexes: number[] | null
  onClose: () => void
  onConfirm: (indexes: number[]) => void
}

export function ImageSelectorDialog({
  open,
  imageUrls,
  initialIndexes,
  onClose,
  onConfirm,
}: ImageSelectorDialogProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (!open) return
    const initial =
      initialIndexes && initialIndexes.length > 0
        ? new Set(initialIndexes.filter((n) => n >= 0 && n < imageUrls.length))
        : new Set(imageUrls.map((_, i) => i))
    setSelected(initial)
  }, [open, initialIndexes, imageUrls])

  const toggle = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const handleConfirm = () => {
    if (selected.size === 0) return
    const indexes = Array.from(selected).sort((a, b) => a - b)
    onConfirm(indexes)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-3xl flex-col p-0">
        <DialogHeader className="border-b border-border-decorative px-6 py-4">
          <DialogTitle>記事化に使う画像を選んでください</DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
          <p className="text-xs text-text-secondary">
            ※ クリックで選択 / 解除。表示順は IG 投稿の順番が保持されます。
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {imageUrls.map((url, idx) => {
              const isSelected = selected.has(idx)
              const id = `image-selector-${idx}`
              return (
                <label
                  key={idx}
                  htmlFor={id}
                  className={`relative aspect-square cursor-pointer overflow-hidden rounded border-2 transition-colors ${
                    isSelected
                      ? 'border-primary'
                      : 'border-border-decorative hover:border-primary/50'
                  }`}
                >
                  <Image
                    src={url}
                    alt={`${idx + 1} 枚目`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, 33vw"
                    unoptimized
                  />
                  <div className="absolute left-2 top-2">
                    <Checkbox
                      id={id}
                      checked={isSelected}
                      onCheckedChange={() => toggle(idx)}
                      className="bg-white/90"
                    />
                  </div>
                  <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs font-medium text-white">
                    {idx + 1}
                  </span>
                </label>
              )
            })}
          </div>
          <p className="text-xs text-text-secondary">
            選択中: {selected.size} / {imageUrls.length} 枚
          </p>
        </div>

        <DialogFooter className="border-t border-border-decorative px-6 py-4">
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={selected.size === 0}
          >
            次へ →
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
