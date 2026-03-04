'use client'

import Link from 'next/link'
import { BookOpen } from 'lucide-react'

export function ChatHeader() {
  return (
    <header className="sticky top-0 z-50 h-14 flex items-center justify-between px-4 sm:px-6 bg-background/95 backdrop-blur-sm border-b border-border-decorative/50">
      <Link
        href="/"
        className="text-xl md:text-2xl font-playfair font-bold text-text-primary hover:text-primary-hover transition-colors duration-200"
      >
        Sayo&apos;s Journal
      </Link>

      <Link
        href="/blog"
        className="flex items-center gap-1.5 text-sm font-noto-sans-jp text-text-secondary hover:text-primary transition-colors duration-200"
      >
        <BookOpen className="w-4 h-4" />
        ブログ
      </Link>
    </header>
  )
}
