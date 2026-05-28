'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import type {
  ClientType,
  LongInquiry,
  LongInquiryStatus,
} from '@/lib/types'
import {
  CLIENT_TYPE_LABELS,
  LONG_INQUIRY_STATUS_LABELS,
  formatClientName,
  formatRelativeTime,
} from '@/lib/inquiries'
import { LongInquiryDetailDialog } from './LongInquiryDetailDialog'
import type { LinkablePost } from '../actions'

interface Props {
  items: LongInquiry[]
  openId?: string
  linkablePosts: LinkablePost[]
}

type StatusFilter = 'all' | LongInquiryStatus
type TypeFilter = 'all' | ClientType
type SortOrder = 'created_desc' | 'created_asc' | 'scheduled_desc' | 'scheduled_asc'

const STATUS_BADGE: Record<LongInquiryStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  contacted: 'bg-sky-100 text-sky-800',
  scheduled: 'bg-indigo-100 text-indigo-800',
  interviewed: 'bg-blue-100 text-blue-800',
  writing: 'bg-violet-100 text-violet-800',
  published: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-600',
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

export function LongInquiriesList({ items, openId, linkablePosts }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState<StatusFilter>('all')
  const [type, setType] = useState<TypeFilter>('all')
  const [sort, setSort] = useState<SortOrder>('created_desc')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (openId && items.some((i) => i.id === openId)) {
      setSelectedId(openId)
    }
  }, [openId, items])

  const filtered = useMemo(() => {
    const list = items.filter((item) => {
      if (status !== 'all' && item.status !== status) return false
      if (type !== 'all' && item.client_type !== type) return false
      return true
    })
    list.sort((a, b) => {
      switch (sort) {
        case 'created_asc':
          return a.created_at.localeCompare(b.created_at)
        case 'created_desc':
          return b.created_at.localeCompare(a.created_at)
        case 'scheduled_asc':
          return (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? '')
        case 'scheduled_desc':
          return (b.scheduled_at ?? '').localeCompare(a.scheduled_at ?? '')
      }
    })
    return list
  }, [items, status, type, sort])

  const selected = items.find((i) => i.id === selectedId) ?? null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-44">
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
          >
            <option value="all">ステータス: すべて</option>
            {(Object.keys(LONG_INQUIRY_STATUS_LABELS) as LongInquiryStatus[]).map(
              (s) => (
                <option key={s} value={s}>
                  {LONG_INQUIRY_STATUS_LABELS[s]}
                </option>
              )
            )}
          </Select>
        </div>
        <div className="w-36">
          <Select
            value={type}
            onChange={(e) => setType(e.target.value as TypeFilter)}
          >
            <option value="all">種別: すべて</option>
            {(Object.keys(CLIENT_TYPE_LABELS) as ClientType[]).map((t) => (
              <option key={t} value={t}>
                {CLIENT_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-44">
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOrder)}
          >
            <option value="created_desc">受付日 新しい順</option>
            <option value="created_asc">受付日 古い順</option>
            <option value="scheduled_desc">取材日 新しい順</option>
            <option value="scheduled_asc">取材日 古い順</option>
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
                <th className="px-4 py-3 font-medium">依頼者</th>
                <th className="px-4 py-3 font-medium">担当者</th>
                <th className="px-4 py-3 font-medium">取材内容</th>
                <th className="px-4 py-3 font-medium">取材日</th>
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
                      {CLIENT_TYPE_LABELS[item.client_type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-primary">
                    {formatClientName(item)}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {item.contact_person}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-text-secondary">
                    {truncate(item.interview_content, 60)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-text-secondary">
                    {item.scheduled_at
                      ? new Date(item.scheduled_at).toLocaleDateString('ja-JP')
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[item.status]}`}
                    >
                      {LONG_INQUIRY_STATUS_LABELS[item.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedId(item.id)}
                    >
                      詳細
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <LongInquiryDetailDialog
        inquiry={selected}
        open={selectedId !== null}
        onClose={() => {
          setSelectedId(null)
          router.refresh()
        }}
        linkablePosts={linkablePosts}
      />
    </div>
  )
}
