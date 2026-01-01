/**
 * Filter utility functions for managing URL search params and filter state
 */

export interface FilterState {
  category?: string
  hashtags?: string[]
  sort?: 'latest' | 'popular' | 'title'
  page?: number
}

export type SortOption = 'latest' | 'popular' | 'title'

export const SORT_OPTIONS: Record<SortOption, { label: string; icon: string }> = {
  latest: { label: '最新順', icon: '🆕' },
  popular: { label: '人気順', icon: '🔥' },
  title: { label: 'タイトル順', icon: '🔤' },
}

/**
 * Parse filters from URL search params
 */
export function parseFiltersFromURL(searchParams: URLSearchParams): FilterState {
  const filters: FilterState = {}

  const category = searchParams.get('category')
  if (category) filters.category = category

  const hashtagsParam = searchParams.get('hashtags')
  if (hashtagsParam) {
    filters.hashtags = hashtagsParam.split(',').filter(Boolean)
  }

  const sort = searchParams.get('sort') as SortOption | null
  if (sort && ['latest', 'popular', 'title'].includes(sort)) {
    filters.sort = sort
  } else {
    filters.sort = 'latest' // Default
  }

  const page = searchParams.get('page')
  if (page) {
    const pageNum = parseInt(page, 10)
    if (!isNaN(pageNum) && pageNum > 0) {
      filters.page = pageNum
    }
  }

  return filters
}

/**
 * Serialize filters to URL search params string
 */
export function serializeFiltersToURL(filters: FilterState): string {
  const params = new URLSearchParams()

  if (filters.category) params.set('category', filters.category)
  if (filters.hashtags && filters.hashtags.length > 0) {
    params.set('hashtags', filters.hashtags.join(','))
  }
  if (filters.sort && filters.sort !== 'latest') {
    params.set('sort', filters.sort)
  }
  if (filters.page && filters.page > 1) {
    params.set('page', filters.page.toString())
  }

  return params.toString()
}

/**
 * Count active filters (excluding sort and page)
 */
export function countActiveFilters(filters: FilterState): number {
  let count = 0
  if (filters.category) count++
  if (filters.hashtags && filters.hashtags.length > 0) count += filters.hashtags.length
  return count
}

/**
 * Check if any filters are active
 */
export function hasActiveFilters(filters: FilterState): boolean {
  return countActiveFilters(filters) > 0
}

/**
 * Clear all filters
 */
export function clearFilters(): FilterState {
  return { sort: 'latest', page: 1 }
}
