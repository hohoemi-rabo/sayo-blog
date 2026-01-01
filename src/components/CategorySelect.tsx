'use client'

import { Category } from '@/lib/types'

interface CategorySelectProps {
  value: string
  onChange: (category: string) => void
  categories: Category[]
  disabled?: boolean
}

export default function CategorySelect({
  value,
  onChange,
  categories,
  disabled,
}: CategorySelectProps) {
  return (
    <div className="flex items-center space-x-2">
      <label
        htmlFor="category"
        className="text-sm font-noto-sans-jp font-medium text-text-primary whitespace-nowrap"
      >
        カテゴリ
      </label>
      <select
        id="category"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="flex-1 px-4 py-2 rounded-lg border border-border-decorative bg-background text-text-primary font-noto-sans-jp focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">すべてのカテゴリ</option>
        {categories.map((category) => (
          <option key={category.id} value={category.slug}>
            {category.name}
          </option>
        ))}
      </select>
    </div>
  )
}
