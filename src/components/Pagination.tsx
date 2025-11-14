'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getPaginationRange } from '@/lib/pagination-utils'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
}

const SCROLL_FLAG_KEY = 'pagination-should-scroll'

export default function Pagination({ currentPage, totalPages, totalItems }: PaginationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Scroll to FilterBar when pagination button was clicked
  useEffect(() => {
    const shouldScroll = sessionStorage.getItem(SCROLL_FLAG_KEY)

    if (shouldScroll === 'true') {
      // Clear flag
      sessionStorage.removeItem(SCROLL_FLAG_KEY)

      // Wait for content to load, then scroll to filter section
      setTimeout(() => {
        const filterBar = document.querySelector('[data-filter-bar]')
        if (filterBar) {
          filterBar.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)
    }
  }, [currentPage])

  // Don't show pagination if only 1 page or no items
  if (totalPages <= 1) {
    return null
  }

  const handlePageChange = (page: number) => {
    // Set flag in sessionStorage to trigger scroll after navigation
    sessionStorage.setItem(SCROLL_FLAG_KEY, 'true')

    const params = new URLSearchParams(searchParams)

    if (page === 1) {
      params.delete('page') // Remove page param for page 1 (cleaner URLs)
    } else {
      params.set('page', page.toString())
    }

    // Navigate
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const pages = getPaginationRange(currentPage, totalPages, 1)

  // Calculate item range
  const itemsPerPage = 12
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  return (
    <div className="mt-12 space-y-6">
      {/* Page info */}
      <div className="text-center text-sm text-text-secondary font-noto-sans-jp">
        {totalItems}件中 {startItem}〜{endItem}件を表示
      </div>

      {/* Pagination controls */}
      <nav className="flex items-center justify-center gap-2" aria-label="ページネーション">
        {/* Previous Button */}
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border border-text-secondary/20 hover:bg-background-dark/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
          aria-label="前のページ"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {pages.map((page, index) => {
            if (page === '...') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="px-2 text-text-secondary"
                  aria-hidden="true"
                >
                  ...
                </span>
              )
            }

            const pageNum = page as number
            const isActive = pageNum === currentPage

            return (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum)}
                className={`
                  min-w-[40px] px-3 py-2 rounded-lg font-medium transition-all duration-200
                  ${
                    isActive
                      ? 'bg-primary text-white shadow-md scale-105'
                      : 'border border-text-secondary/20 hover:bg-background-dark/5 hover:border-primary/30'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
                aria-label={`ページ ${pageNum}`}
              >
                {pageNum}
              </button>
            )
          })}
        </div>

        {/* Next Button */}
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border border-text-secondary/20 hover:bg-background-dark/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
          aria-label="次のページ"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </nav>

      {/* Page indicator (mobile-friendly) */}
      <div className="text-center text-xs text-text-secondary font-noto-sans-jp lg:hidden">
        ページ {currentPage} / {totalPages}
      </div>
    </div>
  )
}
