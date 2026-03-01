'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Settings } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { updateLimit } from '../actions'

interface LimitSettingsProps {
  limits: {
    daily_user: { limit_value: number }
    monthly_site: {
      limit_value: number
      current_value: number
      percentage: number
    }
  }
}

export function LimitSettings({ limits }: LimitSettingsProps) {
  const router = useRouter()
  const [dailyValue, setDailyValue] = useState(limits.daily_user.limit_value)
  const [monthlyValue, setMonthlyValue] = useState(
    limits.monthly_site.limit_value
  )
  const [saving, setSaving] = useState<string | null>(null)
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const handleSave = async (type: 'daily_user' | 'monthly_site') => {
    setSaving(type)
    setMessage(null)

    const value = type === 'daily_user' ? dailyValue : monthlyValue
    const result = await updateLimit(type, value)

    setSaving(null)

    if (result.success) {
      setMessage({ type: 'success', text: '保存しました' })
      router.refresh()
      setTimeout(() => setMessage(null), 3000)
    } else {
      setMessage({
        type: 'error',
        text: result.error || '保存に失敗しました',
      })
    }
  }

  const percentage = limits.monthly_site.percentage
  const progressColor =
    percentage >= 80
      ? 'bg-red-500'
      : percentage >= 50
        ? 'bg-amber-500'
        : 'bg-green-500'

  return (
    <Card className="p-6 bg-white">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="h-5 w-5 text-text-secondary" />
        <h2 className="text-lg font-semibold text-text-primary">制限管理</h2>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-sm mb-4 ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-600'
              : 'bg-red-50 border border-red-200 text-red-600'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* Daily User Limit */}
        <div className="space-y-2">
          <Label htmlFor="daily_limit">
            日次ユーザー制限（1人あたり/日）
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="daily_limit"
              type="number"
              value={dailyValue}
              onChange={(e) => setDailyValue(parseInt(e.target.value) || 0)}
              min={1}
              className="w-32"
            />
            <span className="text-sm text-text-secondary">回</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSave('daily_user')}
              disabled={
                saving === 'daily_user' ||
                dailyValue === limits.daily_user.limit_value
              }
              className="gap-1"
            >
              <Save className="h-3.5 w-3.5" />
              {saving === 'daily_user' ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>

        {/* Monthly Site Limit */}
        <div className="space-y-2">
          <Label htmlFor="monthly_limit">月次サイト上限</Label>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-text-secondary">
              <span>
                {limits.monthly_site.current_value.toLocaleString()} 回使用済み
              </span>
              <span>{percentage}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${progressColor}`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Input
              id="monthly_limit"
              type="number"
              value={monthlyValue}
              onChange={(e) => setMonthlyValue(parseInt(e.target.value) || 0)}
              min={1}
              className="w-32"
            />
            <span className="text-sm text-text-secondary">回</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSave('monthly_site')}
              disabled={
                saving === 'monthly_site' ||
                monthlyValue === limits.monthly_site.limit_value
              }
              className="gap-1"
            >
              <Save className="h-3.5 w-3.5" />
              {saving === 'monthly_site' ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
