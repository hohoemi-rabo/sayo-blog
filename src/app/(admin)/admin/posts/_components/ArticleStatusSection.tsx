'use client'

import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import {
  ARTICLE_STATUS_OPTIONS,
  CLOSURE_NOTE_MAX,
  DEFAULT_CLOSURE_NOTICE,
  RELOCATION_NOTE_MAX,
  normalizeArticleStatus,
  type ArticleStatus,
} from '@/lib/place-status'

export interface ArticleStatusState {
  status: ArticleStatus
  relocation_note: string
  relocation_url: string
  closure_note: string
}

/**
 * 記事編集サイドバーの「記事の状態」カード (通常 / イベント終了 / 閉店 / 移転)。
 * 保存時に event_ended と place_status へ振り分ける (`articleStatusColumns`)。
 */
export function ArticleStatusSection({
  value,
  onChange,
}: {
  value: ArticleStatusState
  onChange: (next: ArticleStatusState) => void
}) {
  const hint = ARTICLE_STATUS_OPTIONS.find((o) => o.value === value.status)?.hint

  return (
    <Card className="p-6 bg-white">
      <h3 className="font-semibold text-text-primary mb-4">記事の状態</h3>
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="article_status">この記事の今の状態</Label>
          <Select
            id="article_status"
            value={value.status}
            onChange={(e) => onChange({ ...value, status: normalizeArticleStatus(e.target.value) })}
          >
            {ARTICLE_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          {hint && <p className="text-xs text-text-secondary">{hint}</p>}
        </div>

        {value.status === 'closed' && (
          <div className="space-y-1 rounded-md bg-background-dark/5 p-3">
            <Label htmlFor="closure_note">閉店のお知らせ文 (任意)</Label>
            <Textarea
              id="closure_note"
              value={value.closure_note}
              maxLength={CLOSURE_NOTE_MAX}
              rows={3}
              onChange={(e) => onChange({ ...value, closure_note: e.target.value })}
            />
            <p className="text-xs text-text-secondary">
              記事ページの写真の下部の帯に出ます (一覧のカードは「閉店されています」のまま)。空欄なら「{DEFAULT_CLOSURE_NOTICE}」と出ます。
              ({value.closure_note.trim().length} / {CLOSURE_NOTE_MAX} 字)
            </p>
          </div>
        )}

        {value.status === 'relocated' && (
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
    </Card>
  )
}
