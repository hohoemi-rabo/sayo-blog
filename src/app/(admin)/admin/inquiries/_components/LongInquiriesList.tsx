import type { LongInquiry } from '@/lib/types'
import {
  CLIENT_TYPE_LABELS,
  LONG_INQUIRY_STATUS_LABELS,
  formatClientName,
  formatRelativeTime,
} from '@/lib/inquiries'

interface Props {
  items: LongInquiry[]
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

export function LongInquiriesList({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border-decorative bg-white/50 px-6 py-16 text-center">
        <p className="text-text-secondary">まだロング記事（取材依頼）はありません</p>
        <p className="mt-1 text-sm text-text-secondary">
          公開フォーム（取材依頼）から届いた依頼がここに表示されます
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border-decorative bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-decorative text-left text-text-secondary">
            <th className="px-4 py-3 font-medium">受付</th>
            <th className="px-4 py-3 font-medium">種別</th>
            <th className="px-4 py-3 font-medium">依頼者</th>
            <th className="px-4 py-3 font-medium">担当者</th>
            <th className="px-4 py-3 font-medium">取材内容</th>
            <th className="px-4 py-3 font-medium">ステータス</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
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
              <td className="px-4 py-3">
                <span className="text-xs font-medium text-text-primary">
                  {LONG_INQUIRY_STATUS_LABELS[item.status]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
