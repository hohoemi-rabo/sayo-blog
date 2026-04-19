'use client'

import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import { AlertTriangle, ImageOff } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import {
  generateIgPosts,
  getPostSections,
  type PostSectionSummary,
} from '../actions'

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
  const [sections, setSections] = useState<PostSectionSummary[]>([])
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set())
  const [articleEditUrl, setArticleEditUrl] = useState<string>('')
  const [isLoadingSections, setIsLoadingSections] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (open) {
      setPostId('')
      setSections([])
      setSelectedIndexes(new Set())
      setArticleEditUrl('')
    }
  }, [open])

  useEffect(() => {
    if (!postId) {
      setSections([])
      setSelectedIndexes(new Set())
      return
    }
    let cancelled = false
    setIsLoadingSections(true)
    getPostSections(postId)
      .then((result) => {
        if (cancelled) return
        setSections(result.sections)
        setArticleEditUrl(result.articleEditUrl)
        // Default: select all sections
        setSelectedIndexes(new Set(result.sections.map((s) => s.index)))
      })
      .catch((err) => {
        if (cancelled) return
        console.error(err)
        onError('セクションの取得に失敗しました')
        setSections([])
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSections(false)
      })
    return () => {
      cancelled = true
    }
  }, [postId, onError])

  const toggleIndex = (idx: number) => {
    setSelectedIndexes((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedIndexes.size === sections.length) {
      setSelectedIndexes(new Set())
    } else {
      setSelectedIndexes(new Set(sections.map((s) => s.index)))
    }
  }

  const hasNoSections = postId !== '' && !isLoadingSections && sections.length === 0
  const canSubmit =
    postId !== '' && !hasNoSections && selectedIndexes.size > 0 && !isPending

  const handleSubmit = () => {
    if (!canSubmit) return
    const indexes = Array.from(selectedIndexes).sort((a, b) => a - b)
    startTransition(async () => {
      const result = await generateIgPosts(postId, indexes)
      if (result.success) {
        onOpenChange(false)
        onGenerated(result.data?.length ?? indexes.length)
      } else {
        onError(result.error)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-2xl flex-col p-0">
        <DialogHeader className="border-b border-border-decorative px-6 py-4">
          <DialogTitle>Instagram 下書きを生成</DialogTitle>
          <DialogDescription>
            記事内の見出しセクションを選んで、それぞれを 1 件の Instagram 投稿として生成します。
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
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

          {/* Section list */}
          {postId && isLoadingSections && (
            <p className="text-sm text-text-secondary">セクションを読み込み中...</p>
          )}

          {hasNoSections && (
            <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm">
              <div className="mb-2 flex items-center gap-2 font-medium text-yellow-800">
                <AlertTriangle className="h-4 w-4" />
                この記事には見出し (h2) がありません
              </div>
              <p className="mb-2 text-yellow-900">
                Instagram 連携には「見出し + 画像 + 文章」のセクション構造が必要です。
                記事編集画面で h2 見出しを追加してから再度お試しください。
              </p>
              {articleEditUrl && (
                <Link
                  href={articleEditUrl}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  記事を編集する →
                </Link>
              )}
            </div>
          )}

          {postId && !isLoadingSections && sections.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium">
                  投稿化するセクション
                </label>
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-xs text-primary hover:underline"
                >
                  {selectedIndexes.size === sections.length
                    ? '全解除'
                    : '全選択'}
                </button>
              </div>
              <ul className="max-h-80 space-y-1 overflow-y-auto rounded-md border border-border-decorative bg-white p-2">
                {sections.map((s) => {
                  const checked = selectedIndexes.has(s.index)
                  return (
                    <li key={s.index}>
                      <label
                        className={`flex cursor-pointer items-start gap-3 rounded p-2 transition-colors ${
                          checked ? 'bg-primary/5' : 'hover:bg-background-dark/5'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleIndex(s.index)}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-text-primary">
                              {s.heading || '(見出しなし)'}
                            </span>
                            {!s.hasImage && (
                              <span
                                className="inline-flex items-center gap-1 text-xs text-yellow-700"
                                title="このセクションに画像がありません。記事サムネイルが使用されます。"
                              >
                                <ImageOff className="h-3 w-3" />
                                画像なし
                              </span>
                            )}
                          </div>
                          {s.textPreview && (
                            <p className="text-xs text-text-secondary">
                              {s.textPreview}
                            </p>
                          )}
                        </div>
                      </label>
                    </li>
                  )
                })}
              </ul>
              <p className="text-xs text-text-secondary">
                選択中: {selectedIndexes.size} / {sections.length} セクション
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border-decorative px-6 py-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isPending
              ? '生成中...'
              : `${selectedIndexes.size} 件生成する`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
