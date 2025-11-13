'use client'

import { SortOption, SORT_OPTIONS } from '@/lib/filter-utils'

interface SortSelectProps {
  value: SortOption
  onChange: (sort: SortOption) => void
  disabled?: boolean
}

export default function SortSelect({ value, onChange, disabled }: SortSelectProps) {
  return (
    <div className="flex items-center space-x-2">
      <label htmlFor="sort" className="text-sm font-noto-sans-jp font-medium text-text-primary whitespace-nowrap">
        並び替え
      </label>
      <select
        id="sort"
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
        disabled={disabled}
        className="flex-1 px-4 py-2 rounded-lg border border-border-decorative bg-background text-text-primary font-noto-sans-jp focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {Object.entries(SORT_OPTIONS).map(([key, option]) => (
          <option key={key} value={key}>
            {option.icon} {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
