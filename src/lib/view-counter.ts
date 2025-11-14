/**
 * View counter utility
 * Throttles view count increments to once per session using localStorage
 */

const VIEWED_KEY_PREFIX = 'viewed_post_'

/**
 * Check if user has already viewed this post in current session
 */
function hasViewedInSession(slug: string): boolean {
  if (typeof window === 'undefined') return true // SSR guard

  try {
    const key = `${VIEWED_KEY_PREFIX}${slug}`
    return localStorage.getItem(key) === 'true'
  } catch (error) {
    console.error('localStorage access error:', error)
    return true // Fail safe - don't increment if localStorage unavailable
  }
}

/**
 * Mark post as viewed in current session
 */
function markAsViewed(slug: string): void {
  if (typeof window === 'undefined') return // SSR guard

  try {
    const key = `${VIEWED_KEY_PREFIX}${slug}`
    localStorage.setItem(key, 'true')
  } catch (error) {
    console.error('localStorage write error:', error)
  }
}

/**
 * Increment view count for a post
 * Throttled to once per session using localStorage
 */
export async function incrementViewCount(slug: string): Promise<void> {
  // Check if already viewed in this session
  if (hasViewedInSession(slug)) {
    return
  }

  try {
    const response = await fetch(`/api/posts/${slug}/view`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      markAsViewed(slug)
    } else {
      console.error('Failed to increment view count:', response.statusText)
    }
  } catch (error) {
    // Don't block page load if view increment fails
    console.error('View count increment error:', error)
  }
}
