/**
 * Pagination utility functions
 */

/**
 * Generate pagination range with ellipsis
 * @param currentPage - Current active page (1-indexed)
 * @param totalPages - Total number of pages
 * @param siblingCount - Number of siblings to show on each side
 * @returns Array of page numbers and ellipsis strings
 *
 * @example
 * getPaginationRange(1, 10, 1) // [1, 2, 3, '...', 10]
 * getPaginationRange(5, 10, 1) // [1, '...', 4, 5, 6, '...', 10]
 * getPaginationRange(10, 10, 1) // [1, '...', 8, 9, 10]
 */
export function getPaginationRange(
  currentPage: number,
  totalPages: number,
  siblingCount: number = 1
): (number | string)[] {
  // If total pages is less than what we want to show, return all pages
  const totalPageNumbers = siblingCount + 5 // siblings + first + last + current + 2 ellipsis

  if (totalPageNumbers >= totalPages) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1)
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages)

  const shouldShowLeftEllipsis = leftSiblingIndex > 2
  const shouldShowRightEllipsis = rightSiblingIndex < totalPages - 1

  // Case 1: No left ellipsis, show right ellipsis
  // [1, 2, 3, '...', 10]
  if (!shouldShowLeftEllipsis && shouldShowRightEllipsis) {
    const leftRange = Array.from({ length: 3 + 2 * siblingCount }, (_, i) => i + 1)
    return [...leftRange, '...', totalPages]
  }

  // Case 2: Show left ellipsis, no right ellipsis
  // [1, '...', 8, 9, 10]
  if (shouldShowLeftEllipsis && !shouldShowRightEllipsis) {
    const rightRange = Array.from(
      { length: 3 + 2 * siblingCount },
      (_, i) => totalPages - (3 + 2 * siblingCount) + i + 1
    )
    return [1, '...', ...rightRange]
  }

  // Case 3: Show both ellipsis
  // [1, '...', 4, 5, 6, '...', 10]
  const middleRange = Array.from(
    { length: rightSiblingIndex - leftSiblingIndex + 1 },
    (_, i) => leftSiblingIndex + i
  )
  return [1, '...', ...middleRange, '...', totalPages]
}

/**
 * Calculate pagination metadata
 * @param totalItems - Total number of items
 * @param currentPage - Current page (1-indexed)
 * @param itemsPerPage - Number of items per page
 * @returns Pagination metadata
 */
export function getPaginationInfo(
  totalItems: number,
  currentPage: number,
  itemsPerPage: number = 12
) {
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const offset = (currentPage - 1) * itemsPerPage
  const limit = itemsPerPage
  const hasNextPage = currentPage < totalPages
  const hasPreviousPage = currentPage > 1

  return {
    totalPages,
    offset,
    limit,
    hasNextPage,
    hasPreviousPage,
    startIndex: offset + 1,
    endIndex: Math.min(offset + itemsPerPage, totalItems),
  }
}

/**
 * Build pagination URL with query parameters
 * @param pathname - Current pathname
 * @param page - Target page number
 * @param searchParams - Current search parameters
 * @returns URL string with updated page parameter
 */
export function buildPaginationUrl(
  pathname: string,
  page: number,
  searchParams: URLSearchParams
): string {
  const params = new URLSearchParams(searchParams)
  params.set('page', page.toString())
  return `${pathname}?${params.toString()}`
}

/**
 * Validate and sanitize page number
 * @param page - Raw page value (string or number)
 * @param totalPages - Total number of pages
 * @returns Valid page number (1 to totalPages)
 */
export function validatePageNumber(page: string | number | undefined, totalPages: number): number {
  const pageNum = typeof page === 'string' ? parseInt(page, 10) : page || 1

  if (isNaN(pageNum) || pageNum < 1) {
    return 1
  }

  if (totalPages > 0 && pageNum > totalPages) {
    return totalPages
  }

  return pageNum
}
