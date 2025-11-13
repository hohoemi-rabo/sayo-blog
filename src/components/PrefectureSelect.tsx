'use client'

import { Category } from '@/lib/types'

interface PrefectureSelectProps {
  value: string
  onChange: (prefecture: string) => void
  prefectures: Category[]
  disabled?: boolean
}

export default function PrefectureSelect({
  value,
  onChange,
  prefectures,
  disabled,
}: PrefectureSelectProps) {
  return (
    <div className="flex items-center space-x-2">
      <label
        htmlFor="prefecture"
        className="text-sm font-noto-sans-jp font-medium text-text-primary whitespace-nowrap"
      >
        地域
      </label>
      <select
        id="prefecture"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="flex-1 px-4 py-2 rounded-lg border border-border-decorative bg-background text-text-primary font-noto-sans-jp focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">すべての地域</option>
        {prefectures.map((prefecture) => (
          <option key={prefecture.id} value={prefecture.slug}>
            {prefecture.name}
          </option>
        ))}
      </select>
    </div>
  )
}
