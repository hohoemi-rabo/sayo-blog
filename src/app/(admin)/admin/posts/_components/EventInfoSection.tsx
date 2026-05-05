'use client'

import { Card } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Checkbox'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

export interface EventInfoState {
  is_event: boolean
  event_date_start: string | null
  event_date_end: string | null
  event_time_start: string | null
  event_time_end: string | null
  event_venue: string | null
  event_address: string | null
  event_fee: string | null
  event_url: string | null
}

interface EventInfoSectionProps {
  value: EventInfoState
  onChange: (next: EventInfoState) => void
}

export function EventInfoSection({ value, onChange }: EventInfoSectionProps) {
  const update = <K extends keyof EventInfoState>(
    key: K,
    next: EventInfoState[K]
  ) => {
    onChange({ ...value, [key]: next })
  }

  const setText = (
    key:
      | 'event_date_start'
      | 'event_date_end'
      | 'event_time_start'
      | 'event_time_end'
      | 'event_venue'
      | 'event_address'
      | 'event_fee'
      | 'event_url'
  ) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.trim()
    update(key, v.length > 0 ? v : null)
  }

  return (
    <Card className="p-6 bg-white">
      <h3 className="font-semibold text-text-primary mb-4">イベント情報</h3>

      <div className="flex items-center gap-3">
        <Checkbox
          id="is_event"
          checked={value.is_event}
          onCheckedChange={(checked) => update('is_event', checked)}
        />
        <Label htmlFor="is_event" className="cursor-pointer">
          これはイベント記事
        </Label>
      </div>
      <p className="mt-2 pl-7 text-xs text-text-secondary">
        ON にすると開催日・会場・料金などの情報を構造化保存し、
        将来のカード表示で日付バッジを大きく表示します。
      </p>

      {value.is_event && (
        <div className="mt-4 space-y-4 border-t border-border-decorative pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="event_date_start">開催日（開始）</Label>
              <Input
                id="event_date_start"
                type="date"
                value={value.event_date_start ?? ''}
                onChange={setText('event_date_start')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event_date_end">開催日（終了）</Label>
              <Input
                id="event_date_end"
                type="date"
                value={value.event_date_end ?? ''}
                onChange={setText('event_date_end')}
              />
            </div>
          </div>
          <p className="text-xs text-text-secondary -mt-1">
            単日開催なら「終了」は空欄のままで OK
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="event_time_start">開始時刻</Label>
              <Input
                id="event_time_start"
                placeholder="例: 10:00"
                value={value.event_time_start ?? ''}
                onChange={setText('event_time_start')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event_time_end">終了時刻</Label>
              <Input
                id="event_time_end"
                placeholder="例: 16:00"
                value={value.event_time_end ?? ''}
                onChange={setText('event_time_end')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event_venue">会場</Label>
            <Input
              id="event_venue"
              placeholder="例: 丘の上結いスクエア"
              value={value.event_venue ?? ''}
              onChange={setText('event_venue')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event_address">住所</Label>
            <Input
              id="event_address"
              placeholder="例: 長野県飯田市〜"
              value={value.event_address ?? ''}
              onChange={setText('event_address')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event_fee">料金</Label>
            <Input
              id="event_fee"
              placeholder='例: "無料" / "500円" / "大人 1000円・子供 500円"'
              value={value.event_fee ?? ''}
              onChange={setText('event_fee')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event_url">公式 URL / 申込フォーム</Label>
            <Input
              id="event_url"
              type="url"
              placeholder="https://..."
              value={value.event_url ?? ''}
              onChange={setText('event_url')}
            />
          </div>
        </div>
      )}
    </Card>
  )
}
