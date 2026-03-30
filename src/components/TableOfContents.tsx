'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronDown } from 'lucide-react'
import { TocHeading } from '@/lib/article-utils'

interface TableOfContentsProps {
  headings: TocHeading[]
}

export default function TableOfContents({ headings }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('')
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (headings.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((e) => e.isIntersecting)
        if (visibleEntries.length > 0) {
          setActiveId(visibleEntries[0].target.id)
        }
      },
      { rootMargin: '-80px 0px -80% 0px', threshold: 0 }
    )

    headings.forEach((heading) => {
      const el = document.getElementById(heading.id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [headings])

  const scrollToHeading = useCallback((id: string) => {
    const element = document.getElementById(id)
    if (element) {
      const offset = 96
      const top = element.getBoundingClientRect().top + window.scrollY - offset
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }, [])

  const handleDesktopClick = useCallback(
    (id: string) => {
      scrollToHeading(id)
    },
    [scrollToHeading]
  )

  const handleMobileClick = useCallback(
    (id: string) => {
      setIsOpen(false)
      setTimeout(() => {
        scrollToHeading(id)
      }, 350)
    },
    [scrollToHeading]
  )

  if (headings.length === 0) return null

  const buildTocList = (onClick: (id: string) => void) => (
    <ul className="space-y-1">
      {headings.map((heading) => (
        <li
          key={heading.id}
          style={{ paddingLeft: `${(heading.level - 2) * 0.75}rem` }}
        >
          <button
            onClick={() => onClick(heading.id)}
            className={`
              text-left text-sm leading-relaxed w-full py-1 px-2 rounded
              transition-all duration-200 font-noto-sans-jp
              ${
                activeId === heading.id
                  ? 'text-primary font-medium bg-primary/5 border-l-2 border-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-background-dark/5'
              }
            `}
          >
            {heading.text}
          </button>
        </li>
      ))}
    </ul>
  )

  return (
    <>
      {/* デスクトップ: サイドバー用 */}
      <nav
        className="hidden xl:block"
        aria-label="目次"
      >
        <h2 className="text-sm font-bold text-text-primary font-noto-sans-jp mb-3 uppercase tracking-wider">
          目次
        </h2>
        {buildTocList(handleDesktopClick)}
      </nav>

      {/* モバイル・タブレット: 折りたたみ */}
      <div className="xl:hidden mb-8">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between w-full py-3 px-4 bg-background-dark/5 rounded-xl text-sm font-noto-sans-jp font-medium text-text-primary"
          aria-expanded={isOpen}
        >
          <span>目次</span>
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-out ${
            isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
        >
          <div className="overflow-hidden">
            <div className="pt-3 px-2">{buildTocList(handleMobileClick)}</div>
          </div>
        </div>
      </div>
    </>
  )
}
