'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import type { MiniInquiry, MiniInquiryStatus, MiniInquiryType } from '@/lib/types'
import {
  MINI_INQUIRY_TYPE_LABELS,
  MINI_INQUIRY_STATUS_LABELS,
  formatMiniPublishPreference,
  formatRelativeTime,
} from '@/lib/inquiries'
import { MiniInquiryDetailDialog } from './MiniInquiryDetailDialog'

interface Props {
  items: MiniInquiry[]
  /** メール通知リンク (?open=) で開く対象 */
  openId?: string
}

type StatusFilter = 'all' | MiniInquiryStatus
type TypeFilter = 'all' | MiniInquiryType
type SortOrder = 'newest' | 'oldest'

const STATUS_BADGE: Record<MiniInquiryStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  generating: 'bg-blue-100 text-blue-800',
  published: 'bg-green-100 text-green-800',
  skipped: 'bg-gray-100 text-gray-600',
}

export function MiniInquiriesList({ items, openId }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState<StatusFilter>('all')
  const [type, setType] = useState<TypeFilter>('all')
  const [sort, setSort] = useState<SortOrder>('newest')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // メール通知リンクからの自動オープン
  useEffect(() => {
    if (openId && items.some((i) => i.id === openId)) {
      setSelectedId(openId)
    }
  }, [openId, items])

  const filtered = useMemo(() => {
    const list = items.filter((item) => {
      if (status !== 'all' && item.status !== status) return false
      if (type !== 'all' && item.inquiry_type !== type) return false
      return true
    })
    list.sort((a, b) => {
      const cmp = a.created_at.localeCompare(b.created_at)
      return sort === 'newest' ? -cmp : cmp
    })
    return list
  }, [items, status, type, sort])

  const selected = items.find((i) => i.id === selectedId) ?? null

  return (
    <div className="space-y-4">
      {/* フィルター */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-44">
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
          >
            <option value="all">ステータス: すべて</option>
            {(Object.keys(MINI_INQUIRY_STATUS_LABELS) as MiniInquiryStatus[]).map(
              (s) => (
                <option key={s} value={s}>
                  {MINI_INQUIRY_STATUS_LABELS[s]}
                </option>
              )
            )}
          </Select>
        </div>
        <div className="w-40">
          <Select
            value={type}
            onChange={(e) => setType(e.target.value as TypeFilter)}
          >
            <option value="all">種別: すべて</option>
            {(Object.keys(MINI_INQUIRY_TYPE_LABELS) as MiniInquiryType[]).map(
              (t) => (
                <option key={t} value={t}>
                  {MINI_INQUIRY_TYPE_LABELS[t]}
                </option>
              )
            )}
          </Select>
        </div>
        <div className="w-32">
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOrder)}
          >
            <option value="newest">新しい順</option>
            <option value="oldest">古い順</option>
          </Select>
        </div>
        <span className="ml-auto text-sm text-text-secondary">
          {filtered.length} 件
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-decorative bg-white/50 px-6 py-16 text-center">
          <p className="text-text-secondary">該当する依頼はありません</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border-decorative bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-decorative text-left text-text-secondary">
                <th className="px-4 py-3 font-medium">受付</th>
                <th className="px-4 py-3 font-medium">種別</th>
                <th className="px-4 py-3 font-medium">URL</th>
                <th className="px-4 py-3 font-medium">添付</th>
                <th className="px-4 py-3 font-medium">連絡先</th>
                <th className="px-4 py-3 font-medium">公開希望</th>
                <th className="px-4 py-3 font-medium">ステータス</th>
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-border-decorative/60 last:border-0 hover:bg-background/50"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-text-secondary">
                    {formatRelativeTime(item.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-background px-2.5 py-0.5 text-xs font-medium text-text-primary">
                      {MINI_INQUIRY_TYPE_LABELS[item.inquiry_type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {item.sns_urls.length} 件
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {item.image_urls.length} 点
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    <div>{item.phone}</div>
                    {item.email && (
                      <div className="text-xs text-text-secondary/80">
                        {item.email}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {formatMiniPublishPreference(item)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[item.status]}`}
                    >
                      {MINI_INQUIRY_STATUS_LABELS[item.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedId(item.id)}
                      >
                        詳細
                      </Button>
                      {(item.status === 'pending' ||
                        item.status === 'generating') && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            router.push(`/admin/inquiries/${item.id}/generate`)
                          }
                        >
                          記事化
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <MiniInquiryDetailDialog
        inquiry={selected}
        open={selectedId !== null}
        onClose={() => setSelectedId(null)}
      />
    </div>
  )
}
