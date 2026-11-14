'use client'

import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Plus, X } from 'lucide-react'
import {
  POST_UPDATE_NOTE_MAX,
  POST_UPDATES_MAX,
  PUBLIC_UPDATE_HISTORY_LIMIT,
  formatDateStringDot,
  toJstDateString,
} from '@/lib/post-updates'

export interface UpdateHistoryRow {
  /** 画面内で行を見分けるための key (DB の id とは限らない) */
  key: string
  updated_on: string
  note: string
}

interface UpdateHistorySectionProps {
  /** 新しい順 */
  value: UpdateHistoryRow[]
  onChange: (next: UpdateHistoryRow[]) => void
  /** 初回掲載日 (YYYY-MM-DD)。これより後の日付の履歴が公開ページの「最終更新」になる */
  publishedOn: string | null
  /** 保存済みの履歴を読めなかった (このまま保存すると消してしまうので編集させない) */
  loadFailed?: boolean
}

let rowSeq = 0
export function newUpdateRowKey(): string {
  rowSeq += 1
  return `new-${rowSeq}`
}

/**
 * 記事編集画面の「更新履歴」カード (Ticket 46)。
 * 季節の情報などを書き足したときに「いつ・何を」を 1 行残す。公開ページの「最終更新」はここの最新日付。
 * 保存は記事の「保存」ボタンでまとめて行う。
 */
export function UpdateHistorySection({
  value,
  onChange,
  publishedOn,
  loadFailed = false,
}: UpdateHistorySectionProps) {
  const addRow = () => {
    onChange([{ key: newUpdateRowKey(), updated_on: toJstDateString(new Date()), note: '' }, ...value])
  }
  const updateRow = (key: string, patch: Partial<UpdateHistoryRow>) => {
    onChange(value.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }
  const removeRow = (key: string) => {
    onChange(value.filter((row) => row.key !== key))
  }

  const latest = value.reduce<string | null>(
    (max, row) => (row.note.trim() && row.updated_on && (!max || row.updated_on > max) ? row.updated_on : max),
    null
  )
  const showsLastUpdated = latest !== null && (!publishedOn || latest > publishedOn)

  return (
    <Card className="p-6 bg-white">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-text-primary">更新履歴</h3>
        {!loadFailed && value.length < POST_UPDATES_MAX && (
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1 rounded-md border border-primary/40 px-3 py-1.5 text-sm text-primary hover:bg-primary/5"
          >
            <Plus className="h-4 w-4" />
            履歴を追加
          </button>
        )}
      </div>

      <p className="mb-4 text-xs text-text-secondary leading-relaxed">
        季節の情報などを書き足したときに、何を更新したかを 1 行で残します。
        ここの一番新しい日付が、記事の「最終更新」になります。誤字を直しただけなら書かなくて大丈夫です
        (書かなければ「最終更新」は変わりません)。
      </p>

      {loadFailed ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          保存済みの更新履歴を読み込めませんでした。ページを読み込み直してください
          (このまま保存しても更新履歴は変わりません)。
        </p>
      ) : value.length === 0 ? (
        <p className="text-sm text-text-secondary">まだありません。</p>
      ) : (
        <ul className="space-y-3">
          {value.map((row) => (
            <li key={row.key} className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <div className="sm:w-40 shrink-0">
                <Label htmlFor={`update-date-${row.key}`} className="sr-only">
                  更新した日
                </Label>
                <Input
                  id={`update-date-${row.key}`}
                  type="date"
                  value={row.updated_on}
                  onChange={(e) => updateRow(row.key, { updated_on: e.target.value })}
                />
              </div>
              <div className="flex-1">
                <Label htmlFor={`update-note-${row.key}`} className="sr-only">
                  更新した内容
                </Label>
                <Input
                  id={`update-note-${row.key}`}
                  value={row.note}
                  maxLength={POST_UPDATE_NOTE_MAX}
                  placeholder="例: 冬季限定メニューと年末年始の営業を追記"
                  onChange={(e) => updateRow(row.key, { note: e.target.value })}
                />
                {row.note.length > POST_UPDATE_NOTE_MAX - 20 && (
                  <p className="mt-1 text-xs text-text-secondary">
                    {row.note.length} / {POST_UPDATE_NOTE_MAX} 文字
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeRow(row.key)}
                aria-label="この履歴を消す"
                className="self-end rounded-md p-2 text-text-secondary hover:bg-gray-100 hover:text-red-600 sm:self-start"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!loadFailed && (
        <p className="mt-4 border-t border-border-decorative pt-3 text-xs text-text-secondary">
          {showsLastUpdated
            ? `保存すると、記事に「最終更新 ${formatDateStringDot(latest!)}」と表示されます。`
            : '初回掲載日より後の日付の履歴があると、記事に「最終更新」が出ます。'}
          記事に出るのは新しい {PUBLIC_UPDATE_HISTORY_LIMIT} 行までで、その下に「初回掲載」の行が自動で付きます。
        </p>
      )}
    </Card>
  )
}
