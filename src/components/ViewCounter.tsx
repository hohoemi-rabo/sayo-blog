'use client'

import { useEffect } from 'react'
import { incrementViewCount } from '@/lib/view-counter'

interface ViewCounterProps {
  slug: string
}

export default function ViewCounter({ slug }: ViewCounterProps) {
  useEffect(() => {
    incrementViewCount(slug)
  }, [slug])

  return null // This component doesn't render anything
}
