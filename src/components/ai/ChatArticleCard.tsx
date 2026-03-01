'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { ArticleCard } from '@/lib/types'

interface ChatArticleCardProps {
  article: ArticleCard
}

export function ChatArticleCard({ article }: ChatArticleCardProps) {
  const href = article.category
    ? `/${article.category}/${article.slug}`
    : `/blog/${article.slug}`

  return (
    <Link
      href={href}
      className="flex gap-3 p-3 rounded-lg border border-border bg-bg-primary hover:shadow-decorative transition-shadow duration-200 group"
    >
      {/* Thumbnail */}
      {article.thumbnail_url && (
        <div className="relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden">
          <Image
            src={article.thumbnail_url}
            alt={article.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-200"
            sizes="80px"
          />
        </div>
      )}

      {/* Text */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold text-text-primary line-clamp-2 font-noto-sans-jp group-hover:text-primary transition-colors duration-200">
          {article.title}
        </h4>
        {article.excerpt && (
          <p className="mt-1 text-xs text-text-secondary line-clamp-2">
            {article.excerpt}
          </p>
        )}
      </div>
    </Link>
  )
}
