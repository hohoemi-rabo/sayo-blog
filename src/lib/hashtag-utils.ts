/**
 * Calculate font size based on hashtag usage count
 * @param count - Hashtag usage count
 * @param minCount - Minimum count in dataset
 * @param maxCount - Maximum count in dataset
 * @returns Font size in rem (0.875 - 2.0)
 */
export function calculateFontSize(count: number, minCount: number, maxCount: number): number {
  const minSize = 0.875 // 14px
  const maxSize = 2.0   // 32px

  if (maxCount === minCount) {
    return (minSize + maxSize) / 2
  }

  // Linear interpolation
  const normalized = (count - minCount) / (maxCount - minCount)
  const fontSize = minSize + normalized * (maxSize - minSize)

  return Math.round(fontSize * 1000) / 1000 // Round to 3 decimals
}

/**
 * Format hashtag count with commas
 */
export function formatHashtagCount(count: number): string {
  if (count >= 10000) {
    return `${Math.floor(count / 1000)}k+`
  }
  return count.toLocaleString('ja-JP')
}
