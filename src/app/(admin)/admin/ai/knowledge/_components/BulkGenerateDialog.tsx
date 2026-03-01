'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/Dialog'

interface BulkGenerateDialogProps {
  totalPosts: number
  totalKnowledge: number
}

type DialogPhase = 'confirm' | 'generating' | 'complete'

interface ProgressData {
  current: number
  total: number
  title: string
}

interface CompleteData {
  success: number
  failed: number
  errors: Array<{ post_id: string; title: string; error: string }>
}

export function BulkGenerateDialog({
  totalPosts,
  totalKnowledge,
}: BulkGenerateDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<DialogPhase>('confirm')
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const [result, setResult] = useState<CompleteData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const remainingCount = totalPosts - totalKnowledge

  const handleStart = useCallback(async () => {
    setPhase('generating')
    setProgress(null)
    setResult(null)
    setError(null)

    try {
      const response = await fetch('/api/admin/ai/knowledge/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerate_embedding: true }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        setError(data.error || `エラーが発生しました (${response.status})`)
        setPhase('complete')
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        setError('ストリームの読み取りに失敗しました')
        setPhase('complete')
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Parse SSE events from buffer
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        let eventType = ''
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            const data = line.slice(6)
            try {
              const parsed = JSON.parse(data)
              if (eventType === 'progress') {
                setProgress(parsed)
              } else if (eventType === 'complete') {
                setResult(parsed)
                setPhase('complete')
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }

      // If we didn't receive a complete event, mark as done
      if (phase !== 'complete') {
        setPhase('complete')
      }
    } catch (err) {
      console.error('Bulk generation error:', err)
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
      setPhase('complete')
    }
  }, [phase])

  const handleClose = () => {
    if (phase === 'generating') return // Don't close while generating
    setOpen(false)
    setPhase('confirm')
    setProgress(null)
    setResult(null)
    setError(null)
    if (result) {
      router.refresh()
    }
  }

  const progressPercent =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0

  return (
    <>
      <Button
        variant="outline"
        className="gap-2"
        onClick={() => setOpen(true)}
      >
        <Sparkles className="h-4 w-4" />
        一括生成
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {phase === 'confirm' && 'AI ナレッジ一括生成'}
              {phase === 'generating' && '生成中...'}
              {phase === 'complete' && '完了'}
            </DialogTitle>
            {phase === 'confirm' && (
              <DialogDescription>
                {totalPosts}記事分のナレッジデータを AI
                で生成します。数分かかる場合があります。
                {remainingCount > 0 && (
                  <>
                    <br />
                    未作成: {remainingCount}件 / 既存:
                    {totalKnowledge}件（上書きされます）
                  </>
                )}
              </DialogDescription>
            )}
          </DialogHeader>

          {/* Generating progress */}
          {phase === 'generating' && progress && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">
                  {progress.current} / {progress.total}
                </span>
                <span className="font-medium">{progressPercent}%</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-sm text-text-secondary truncate">
                処理中: {progress.title}
              </p>
            </div>
          )}

          {phase === 'generating' && !progress && (
            <div className="py-8 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-sm text-text-secondary">準備中...</p>
            </div>
          )}

          {/* Complete result */}
          {phase === 'complete' && result && (
            <div className="space-y-3 py-4">
              <div className="flex gap-4 justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {result.success}
                  </div>
                  <div className="text-sm text-text-secondary">成功</div>
                </div>
                {result.failed > 0 && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-500">
                      {result.failed}
                    </div>
                    <div className="text-sm text-text-secondary">失敗</div>
                  </div>
                )}
              </div>
              {result.errors.length > 0 && (
                <div className="max-h-32 overflow-y-auto text-sm space-y-1">
                  {result.errors.map((err, i) => (
                    <div
                      key={i}
                      className="p-2 bg-red-50 rounded text-red-600"
                    >
                      {err.title}: {err.error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Error without result */}
          {phase === 'complete' && !result && error && (
            <div className="py-4">
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                {error}
              </div>
            </div>
          )}

          <DialogFooter>
            {phase === 'confirm' && (
              <>
                <Button variant="outline" onClick={handleClose}>
                  キャンセル
                </Button>
                <Button onClick={handleStart} className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  生成開始
                </Button>
              </>
            )}
            {phase === 'complete' && (
              <Button onClick={handleClose}>閉じる</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
