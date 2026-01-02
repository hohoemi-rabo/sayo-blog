'use client'

import { useEffect } from 'react'
import { incrementViewCount } from '@/lib/view-counter'

interface ViewCounterProps {
  slug: string
}

// Module-level Set to track processed slugs (persists across StrictMode remounts)
const processedSlugs = new Set<string>()

export default function ViewCounter({ slug }: ViewCounterProps) {
  useEffect(() => {
    // Prevent double increment in React StrictMode
    if (processedSlugs.has(slug)) return
    processedSlugs.add(slug)

    incrementViewCount(slug)
  }, [slug])

  return null // This component doesn't render anything
}
