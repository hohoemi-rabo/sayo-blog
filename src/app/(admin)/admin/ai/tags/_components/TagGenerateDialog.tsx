'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Checkbox } from '@/components/ui/Checkbox'
import { bulkCreateTags } from '../actions'

interface GeneratedTag {
  label: string
  prompt: string
  tag_type: string
}

const TAG_TYPE_LABELS: Record<string, string> = {
  purpose: '目的',
  area: 'エリア',
  scene: 'シーン',
}

const TAG_TYPE_BADGE_STYLES: Record<string, string> = {
  purpose: 'bg-primary/10 text-primary',
  area: 'bg-blue-50 text-blue-600',
  scene: 'bg-green-50 text-green-600',
}

export function TagGenerateDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'confirm' | 'generating' | 'preview' | 'saving'>('confirm')
  const [generatedTags, setGeneratedTags] = useState<GeneratedTag[]>([])
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [savedCount, setSavedCount] = useState(0)

  const handleOpen = () => {
    setOpen(true)
    setStep('confirm')
    setGeneratedTags([])
    setSelectedIndices(new Set())
    setError(null)
    setSavedCount(0)
  }

  const handleGenerate = async () => {
    setStep('generating')
    setError(null)

    try {
      const res = await fetch('/api/admin/ai/tags/generate', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || '生成に失敗しました')
      }

      const data = await res.json()
      const tags: GeneratedTag[] = data.tags || []

      if (tags.length === 0) {
        throw new Error('タグが生成されませんでした')
      }

      setGeneratedTags(tags)
      setSelectedIndices(new Set(tags.map((_, i) => i)))
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成に失敗しました')
      setStep('confirm')
    }
  }

  const handleToggleSelect = (index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedIndices.size === generatedTags.length) {
      setSelectedIndices(new Set())
    } else {
      setSelectedIndices(new Set(generatedTags.map((_, i) => i)))
    }
  }

  const handleSave = async () => {
    const tagsToSave = generatedTags.filter((_, i) => selectedIndices.has(i))
    if (tagsToSave.length === 0) return

    setStep('saving')
    setError(null)

    const result = await bulkCreateTags(tagsToSave)

    if (result.success) {
      setSavedCount(result.count || tagsToSave.length)
      setOpen(false)
      router.refresh()
    } else {
      setError(result.error || '保存に失敗しました')
      setStep('preview')
    }
  }

  return (
    <>
      <Button variant="outline" onClick={handleOpen} className="gap-2">
        <Sparkles className="h-4 w-4" />
        AI で一括生成
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {step === 'confirm' && (
            <>
              <DialogHeader>
                <DialogTitle>AI でタグを一括生成</DialogTitle>
                <DialogDescription>
                  ナレッジデータを分析し、ユーザーが質問しそうなプロンプトタグを自動生成します。
                  生成後にプレビューで選択・編集してから保存できます。
                </DialogDescription>
              </DialogHeader>
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                  {error}
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  キャンセル
                </Button>
                <Button onClick={handleGenerate} className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  生成する
                </Button>
              </DialogFooter>
            </>
          )}

          {step === 'generating' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-text-secondary">
                ナレッジデータを分析中...
              </p>
              <p className="text-xs text-text-secondary">
                数十秒かかる場合があります
              </p>
            </div>
          )}

          {step === 'preview' && (
            <>
              <DialogHeader>
                <DialogTitle>生成されたタグ</DialogTitle>
                <DialogDescription>
                  保存するタグを選択してください。{generatedTags.length} 件生成されました。
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-1">
                <div className="flex items-center justify-between pb-2 border-b border-border-decorative">
                  <button
                    onClick={handleSelectAll}
                    className="text-sm text-primary hover:underline"
                  >
                    {selectedIndices.size === generatedTags.length
                      ? 'すべて解除'
                      : 'すべて選択'}
                  </button>
                  <span className="text-sm text-text-secondary">
                    {selectedIndices.size} / {generatedTags.length} 件選択中
                  </span>
                </div>

                <div className="space-y-1 max-h-[50vh] overflow-y-auto">
                  {generatedTags.map((tag, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                        selectedIndices.has(index)
                          ? 'border-primary/30 bg-primary/5'
                          : 'border-border-decorative hover:bg-gray-50'
                      }`}
                      onClick={() => handleToggleSelect(index)}
                    >
                      <div className="pt-0.5">
                        <Checkbox
                          checked={selectedIndices.has(index)}
                          onCheckedChange={() => handleToggleSelect(index)}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-text-primary text-sm">
                            {tag.label}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              TAG_TYPE_BADGE_STYLES[tag.tag_type] || TAG_TYPE_BADGE_STYLES.purpose
                            }`}
                          >
                            {TAG_TYPE_LABELS[tag.tag_type] || tag.tag_type}
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary mt-1 truncate">
                          {tag.prompt}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                  {error}
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  キャンセル
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={selectedIndices.size === 0}
                  className="gap-2"
                >
                  <Check className="h-4 w-4" />
                  {selectedIndices.size} 件を保存
                </Button>
              </DialogFooter>
            </>
          )}

          {step === 'saving' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-text-secondary">保存中...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {savedCount > 0 && (
        <div className="fixed bottom-4 right-4 p-4 rounded-lg bg-green-50 border border-green-200 text-green-600 shadow-lg animate-in fade-in slide-in-from-bottom-2">
          {savedCount} 件のタグを保存しました
        </div>
      )}
    </>
  )
}
