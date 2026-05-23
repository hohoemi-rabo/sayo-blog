import type { MiniInquiry } from '@/lib/types'
import {
  MINI_INQUIRY_TYPE_LABELS,
  MINI_INQUIRY_STATUS_LABELS,
  formatMiniPublishPreference,
  formatRelativeTime,
} from '@/lib/inquiries'

interface Props {
  items: MiniInquiry[]
}

export function MiniInquiriesList({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border-decorative bg-white/50 px-6 py-16 text-center">
        <p className="text-text-secondary">まだミニ記事の依頼はありません</p>
        <p className="mt-1 text-sm text-text-secondary">
          公開フォーム（ミニ記事）から届いた依頼がここに表示されます
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
            <th className="px-4 py-3 font-medium">URL</th>
            <th className="px-4 py-3 font-medium">画像</th>
            <th className="px-4 py-3 font-medium">連絡先</th>
            <th className="px-4 py-3 font-medium">公開希望</th>
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
                  {MINI_INQUIRY_TYPE_LABELS[item.inquiry_type]}
                </span>
              </td>
              <td className="px-4 py-3 text-text-secondary">
                {item.sns_urls.length} 件
              </td>
              <td className="px-4 py-3 text-text-secondary">
                {item.image_urls.length} 枚
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
                <span className="text-xs font-medium text-text-primary">
                  {MINI_INQUIRY_STATUS_LABELS[item.status]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
