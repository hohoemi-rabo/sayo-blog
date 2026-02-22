'use client'

import { useEffect, useRef } from 'react'

export default function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const bar = barRef.current
    if (!bar) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      bar.style.display = 'none'
      return
    }

    let ticking = false

    const updateProgress = () => {
      if (!bar) return
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement
      const maxScroll = scrollHeight - clientHeight
      const progress = maxScroll > 0 ? scrollTop / maxScroll : 0
      bar.style.transform = `scaleX(${Math.min(Math.max(progress, 0), 1)})`
      ticking = false
    }

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updateProgress)
        ticking = true
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    updateProgress()

    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      ref={barRef}
      className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent-purple origin-left z-[60] will-change-transform pointer-events-none"
      style={{ transform: 'scaleX(0)' }}
      role="progressbar"
      aria-label="読み進み状況"
    />
  )
}
