'use client'

import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import {
  PLACE_STATUS_OPTIONS,
  RELOCATION_NOTE_MAX,
  normalizePlaceStatus,
  type PlaceStatus,
} from '@/lib/place-status'

export interface PlaceStatusState {
  place_status: PlaceStatus
  relocation_note: string
  relocation_url: string
}

const HINTS: Record<PlaceStatus, string> = {
  open: '紹介したお店・場所が今も営業しているときはこのまま。',
  closed:
    'サムネイルが白黒になり「閉店されています」と表示されます。トップページ・関連記事には出なくなります (記事は残ります)。',
  relocated:
    '写真はカラーのまま「移転されています」の印が付きます。記事ページには下の移転先が表示されます。',
}

/** 記事編集「公開設定」内の、お店の状態 (閉店 / 移転) の欄 */
export function PlaceStatusSection({
  value,
  onChange,
}: {
  value: PlaceStatusState
  onChange: (next: PlaceStatusState) => void
}) {
  return (
    <div className="border-t border-border-decorative pt-4 space-y-3">
      <div className="space-y-2">
        <Label htmlFor="place_status">お店・場所の状態</Label>
        <Select
          id="place_status"
          value={value.place_status}
          onChange={(e) => onChange({ ...value, place_status: normalizePlaceStatus(e.target.value) })}
        >
          {PLACE_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <p className="text-xs text-text-secondary">{HINTS[value.place_status]}</p>
      </div>

      {value.place_status === 'relocated' && (
        <div className="space-y-3 rounded-md bg-background-dark/5 p-3">
          <div className="space-y-1">
            <Label htmlFor="relocation_note">移転先 (任意)</Label>
            <Input
              id="relocation_note"
              value={value.relocation_note}
              maxLength={RELOCATION_NOTE_MAX}
              placeholder="例: 飯田市本町へ移転しました"
              onChange={(e) => onChange({ ...value, relocation_note: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="relocation_url">移転先のページ (任意)</Label>
            <Input
              id="relocation_url"
              type="url"
              value={value.relocation_url}
              placeholder="https://"
              onChange={(e) => onChange({ ...value, relocation_url: e.target.value })}
            />
            <p className="text-xs text-text-secondary">
              お店の Instagram や、移転後を紹介した記事の URL など。
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
