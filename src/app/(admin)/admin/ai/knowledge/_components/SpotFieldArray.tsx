'use client'

import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import type { KnowledgeSpot } from '@/lib/types'

interface SpotFieldArrayProps {
  spots: KnowledgeSpot[]
  onChange: (spots: KnowledgeSpot[]) => void
}

const emptySpot: KnowledgeSpot = {
  name: '',
  address: '',
  phone: '',
  hours: '',
  note: '',
}

export function SpotFieldArray({ spots, onChange }: SpotFieldArrayProps) {
  const addSpot = () => {
    onChange([...spots, { ...emptySpot }])
  }

  const removeSpot = (index: number) => {
    onChange(spots.filter((_, i) => i !== index))
  }

  const updateSpot = (index: number, field: keyof KnowledgeSpot, value: string) => {
    const updated = spots.map((spot, i) =>
      i === index ? { ...spot, [field]: value } : spot
    )
    onChange(updated)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>スポット情報</Label>
        <Button type="button" variant="outline" size="sm" onClick={addSpot} className="gap-1">
          <Plus className="h-3 w-3" />
          スポットを追加
        </Button>
      </div>

      {spots.length === 0 && (
        <p className="text-sm text-text-secondary py-2">
          スポット情報はありません
        </p>
      )}

      {spots.map((spot, index) => (
        <div
          key={index}
          className="p-4 rounded-lg border border-border-decorative bg-gray-50 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-secondary">
              スポット {index + 1}
            </span>
            <button
              type="button"
              onClick={() => removeSpot(index)}
              className="p-1 rounded hover:bg-red-50 transition-colors"
              title="削除"
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">名前 *</Label>
              <Input
                value={spot.name}
                onChange={(e) => updateSpot(index, 'name', e.target.value)}
                placeholder="スポット名"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">住所</Label>
              <Input
                value={spot.address || ''}
                onChange={(e) => updateSpot(index, 'address', e.target.value)}
                placeholder="住所"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">電話番号</Label>
              <Input
                value={spot.phone || ''}
                onChange={(e) => updateSpot(index, 'phone', e.target.value)}
                placeholder="電話番号"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">営業時間</Label>
              <Input
                value={spot.hours || ''}
                onChange={(e) => updateSpot(index, 'hours', e.target.value)}
                placeholder="営業時間"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">備考</Label>
            <Input
              value={spot.note || ''}
              onChange={(e) => updateSpot(index, 'note', e.target.value)}
              placeholder="備考"
            />
          </div>
        </div>
      ))}
    </div>
  )
}
