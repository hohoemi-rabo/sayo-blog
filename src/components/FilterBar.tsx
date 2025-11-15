'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { X } from 'lucide-react'
import PrefectureSelect from './PrefectureSelect'
import HashtagInput from './HashtagInput'
import SortSelect from './SortSelect'
import { Button } from './ui/Button'
import { Category, Hashtag } from '@/lib/types'
import {
  parseFiltersFromURL,
  serializeFiltersToURL,
  countActiveFilters,
  SortOption,
} from '@/lib/filter-utils'

interface FilterBarProps {
  prefectures: Category[]
  popularHashtags: Hashtag[]
}

export default function FilterBar({ prefectures, popularHashtags }: FilterBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentFilters = parseFiltersFromURL(searchParams)
  const activeFilterCount = countActiveFilters(currentFilters)

  const updateFilters = (newFilters: Partial<typeof currentFilters>) => {
    const updatedFilters = { ...currentFilters, ...newFilters, page: 1 } // Reset to page 1
    const queryString = serializeFiltersToURL(updatedFilters)

    startTransition(() => {
      router.push(`/?${queryString}`, { scroll: false })
    })
  }

  const handlePrefectureChange = (prefecture: string) => {
    updateFilters({ prefecture: prefecture || undefined })
  }

  const handleHashtagsChange = (hashtags: string[]) => {
    updateFilters({ hashtags: hashtags.length > 0 ? hashtags : undefined })
  }

  const handleSortChange = (sort: SortOption) => {
    updateFilters({ sort })
  }

  const handleClearFilters = () => {
    startTransition(() => {
      router.push('/', { scroll: false })
    })
  }

  return (
    <div
      data-filter-bar
      className="bg-background-dark/5 backdrop-blur-sm rounded-xl p-4 md:p-6 mb-8 border border-border-decorative animate-fade-in"
    >
      <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
        {/* Prefecture & Sort (side by side on mobile) */}
        <div className="flex flex-col sm:flex-row gap-4 lg:flex-1">
          <div className="flex-1">
            <PrefectureSelect
              value={currentFilters.prefecture || ''}
              onChange={handlePrefectureChange}
              prefectures={prefectures}
              disabled={isPending}
            />
          </div>
          <div className="flex-1">
            <SortSelect
              value={currentFilters.sort || 'latest'}
              onChange={handleSortChange}
              disabled={isPending}
            />
          </div>
        </div>

        {/* Hashtag input */}
        <div className="lg:flex-1">
          <HashtagInput
            selectedHashtags={currentFilters.hashtags || []}
            onChange={handleHashtagsChange}
            availableHashtags={popularHashtags}
            disabled={isPending}
          />
        </div>

        {/* Clear button */}
        {activeFilterCount > 0 && (
          <div className="flex items-end animate-fade-in">
            <Button
              variant="outline"
              onClick={handleClearFilters}
              disabled={isPending}
              className="w-full sm:w-auto whitespace-nowrap"
            >
              <X className="w-4 h-4 mr-2" />
              フィルターをクリア ({activeFilterCount})
            </Button>
          </div>
        )}
      </div>

      {/* Loading indicator */}
      {isPending && (
        <div className="mt-4 flex items-center justify-center">
          <div className="flex items-center space-x-2 text-primary">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="text-sm font-noto-sans-jp">読み込み中...</span>
          </div>
        </div>
      )}
    </div>
  )
}
