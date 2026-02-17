import { SITE_CONFIG } from '@/lib/site-config'

/**
 * Truncate text to maxLength without cutting words in half.
 * Appends ellipsis if truncated.
 */
export function truncateDescription(text: string, maxLength: number = 155): string {
  if (!text) return SITE_CONFIG.description
  if (text.length <= maxLength) return text

  // For Japanese text, character-level truncation is acceptable
  const truncated = text.slice(0, maxLength - 1)

  // Try to find a natural break point (period, comma, space)
  const lastBreak = Math.max(
    truncated.lastIndexOf('。'),
    truncated.lastIndexOf('、'),
    truncated.lastIndexOf(' '),
    truncated.lastIndexOf('\n')
  )

  if (lastBreak > maxLength * 0.7) {
    return truncated.slice(0, lastBreak + 1)
  }

  return truncated + '…'
}

/**
 * Build a full canonical URL from a relative path.
 * Removes trailing slash for consistency.
 */
export function generateCanonicalUrl(path: string): string {
  const base = SITE_CONFIG.url.replace(/\/$/, '')
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${base}${cleanPath}`
}

/**
 * Convert hashtag objects to a comma-separated keywords string.
 */
export function extractKeywords(
  hashtags: Array<{ name: string }>,
  additionalKeywords?: string[]
): string[] {
  const hashtagNames = hashtags.map((h) => h.name)
  return [...(additionalKeywords || SITE_CONFIG.keywords), ...hashtagNames]
}
