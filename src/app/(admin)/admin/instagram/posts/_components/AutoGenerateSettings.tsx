'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Checkbox } from '@/components/ui/Checkbox'
import { useToast } from '@/components/ui/Toast'
import { updateAutoGenerateConfig } from '../actions'

interface AutoGenerateSettingsProps {
  initialEnabled: boolean
}

export function AutoGenerateSettings({ initialEnabled }: AutoGenerateSettingsProps) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [isPending, startTransition] = useTransition()
  const { addToast } = useToast()
  const router = useRouter()

  const handleChange = (next: boolean) => {
    const previous = enabled
    setEnabled(next)
    startTransition(async () => {
      const result = await updateAutoGenerateConfig(next)
      if (result.success) {
        addToast(
          next
            ? '記事公開時の自動生成を ON にしました'
            : '記事公開時の自動生成を OFF にしました',
          'success'
        )
        router.refresh()
      } else {
        setEnabled(previous)
        addToast(result.error, 'error', 5000)
      }
    })
  }

  return (
    <div className="rounded-lg border border-border-decorative bg-white p-4">
      <div className="flex items-start gap-3">
        <Checkbox
          id="ig_auto_generate"
          checked={enabled}
          onCheckedChange={handleChange}
          disabled={isPending}
        />
        <div className="flex-1">
          <label
            htmlFor="ig_auto_generate"
            className="cursor-pointer text-sm font-medium text-text-primary"
          >
            記事公開時に IG 下書きを自動生成する（全セクション）
          </label>
          <p className="mt-1 text-xs text-text-secondary">
            ON の場合、記事を「公開」に切り替えた時点で全 h2 セクション分の下書きを自動生成します。既に下書きがある記事は重複生成されません。
          </p>
        </div>
      </div>
    </div>
  )
}
