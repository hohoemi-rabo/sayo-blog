'use client'

import type { IgImportRow } from '@/lib/ig-csv-parser'

interface CsvPreviewProps {
  rows: IgImportRow[]
}

const PREVIEW_LIMIT = 5

export function CsvPreview({ rows }: CsvPreviewProps) {
  if (rows.length === 0) return null

  const visible = rows.slice(0, PREVIEW_LIMIT)
  const remaining = rows.length - visible.length

  return (
    <div className="rounded-lg border border-border-decorative bg-white">
      <div className="border-b border-border-decorative bg-background-dark/5 px-4 py-2 text-xs font-medium text-text-secondary">
        プレビュー（先頭 {visible.length} 件 / 全 {rows.length} 件）
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-text-secondary">
            <tr>
              <th className="px-3 py-2 font-medium">post_id</th>
              <th className="px-3 py-2 font-medium">posted_at</th>
              <th className="px-3 py-2 font-medium">caption（先頭 50 文字）</th>
              <th className="px-3 py-2 font-medium">画像</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.post_id} className="border-t border-border-decorative">
                <td className="px-3 py-2 font-mono text-xs">{row.post_id}</td>
                <td className="px-3 py-2 text-xs text-text-secondary">
                  {row.posted_at}
                </td>
                <td className="px-3 py-2 text-xs">
                  {truncate(row.caption.replace(/\s+/g, ' '), 50)}
                </td>
                <td className="px-3 py-2 text-xs text-text-secondary">
                  {row.image_files.length} 枚
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {remaining > 0 && (
        <div className="border-t border-border-decorative px-4 py-2 text-xs text-text-secondary">
          他 {remaining} 件...
        </div>
      )}
    </div>
  )
}

function truncate(s: string, len: number): string {
  return s.length > len ? `${s.slice(0, len)}…` : s
}
