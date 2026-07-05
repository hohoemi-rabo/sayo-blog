'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Label } from '@/components/ui/Label'
import { Sparkles, Loader2, RefreshCw } from 'lucide-react'
import {
  generateAISummaries,
  generateAISingleSummary,
} from '../actions'
import { SUMMARY_LEVELS, type SummaryLevel } from '@/lib/summary-levels'

export interface SummaryState {
  summary_short: string | null
  summary_medium: string | null
  summary_long: string | null
}

interface SummarySectionProps {
  value: SummaryState
  onChange: (next: SummaryState) => void
  /** 生成元となる本文 (Tiptap HTML) */
  body: string
}

const LEVELS: Array<{ level: SummaryLevel; field: keyof SummaryState }> = [
  { level: 'short', field: 'summary_short' },
  { level: 'medium', field: 'summary_medium' },
  { level: 'long', field: 'summary_long' },
]

export function SummarySection({ value, onChange, body }: SummarySectionProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatingLevel, setGeneratingLevel] = useState<SummaryLevel | null>(
    null
  )
  const [error, setError] = useState<string | null>(null)

  const bodyEmpty = !body || !body.trim()
  const busy = isGenerating || generatingLevel !== null

  const update = (field: keyof SummaryState, next: string) => {
    onChange({ ...value, [field]: next.length > 0 ? next : null })
  }

  const handleGenerateAll = async () => {
    setError(null)
    setIsGenerating(true)
    try {
      const result = await generateAISummaries(body)
      if (result.success) {
        onChange({
          summary_short: result.summaries.short || null,
          summary_medium: result.summaries.medium || null,
          summary_long: result.summaries.long || null,
        })
      } else {
        setError(result.error)
      }
    } catch {
      setError('要約の生成中にエラーが発生しました。')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRegenerate = async (level: SummaryLevel, field: keyof SummaryState) => {
    setError(null)
    setGeneratingLevel(level)
    try {
      const result = await generateAISingleSummary(body, level)
      if (result.success) {
        update(field, result.summary)
      } else {
        setError(result.error)
      }
    } catch {
      setError('要約の生成中にエラーが発生しました。')
    } finally {
      setGeneratingLevel(null)
    }
  }

  return (
    <Card className="p-6 bg-white">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-semibold text-text-primary">
          <Sparkles className="h-4 w-4 text-primary" />
          AI要約
        </h3>
        <Button
          type="button"
          size="sm"
          onClick={handleGenerateAll}
          disabled={bodyEmpty || busy}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <Sparkles className="mr-1.5 h-4 w-4" />
              AIで生成
            </>
          )}
        </Button>
      </div>

      <p className="mb-4 text-xs text-text-secondary">
        本文をもとに「さくっと / ほどよく / じっくり」の3段階要約を生成します。
        生成後に手直しできます。すべて空欄の記事では公開ページに要約は表示されません。
      </p>

      {bodyEmpty && (
        <p className="mb-4 rounded-md bg-gray-50 px-3 py-2 text-xs text-text-secondary">
          本文を入力すると生成できます。
        </p>
      )}

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="space-y-5">
        {LEVELS.map(({ level, field }) => {
          const cfg = SUMMARY_LEVELS[level]
          const text = value[field] ?? ''
          const isThisGenerating = generatingLevel === level
          return (
            <div key={level} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={`summary_${level}`}>
                  {cfg.label}
                  <span className="ml-1 text-xs font-normal text-text-secondary">
                    （{cfg.readingTime}）
                  </span>
                </Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleRegenerate(level, field)}
                  disabled={bodyEmpty || busy}
                >
                  {isThisGenerating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  <span className="ml-1">再生成</span>
                </Button>
              </div>
              <Textarea
                id={`summary_${level}`}
                value={text}
                onChange={(e) => update(field, e.target.value)}
                rows={level === 'short' ? 3 : level === 'medium' ? 5 : 8}
                placeholder={`${cfg.label}の要約`}
              />
              <p className="text-right text-xs text-text-secondary">
                {text.length} 文字
              </p>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
