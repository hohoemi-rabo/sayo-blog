import Image from 'next/image'
import { Calendar, Eye } from 'lucide-react'
import { Category } from '@/lib/types'
import CategoryBadge from './CategoryBadge'

interface ArticleHeroProps {
  title: string
  thumbnail?: string | null
  categories: Category[]
  publishedAt?: string | null
  updatedAt: string
  viewCount: number
}

export default function ArticleHero({
  title,
  thumbnail,
  categories,
  publishedAt,
  updatedAt,
  viewCount,
}: ArticleHeroProps) {
  // Format date: YYYY年MM月DD日
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
  }

  const formattedPublishedAt = formatDate(publishedAt)
  const formattedUpdatedAt = formatDate(updatedAt)
  const showUpdatedAt = publishedAt && updatedAt && publishedAt !== updatedAt

  return (
    <header className="mb-8 lg:mb-12">
      {/* Hero Image */}
      {thumbnail && (
        <div className="relative aspect-[16/9] w-full mb-6 rounded-2xl overflow-hidden shadow-decorative-lg">
          <Image
            src={thumbnail}
            alt={title}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 80vw, 70vw"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background-dark/60 via-transparent to-transparent" />
        </div>
      )}

      {/* Title */}
      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-playfair font-bold text-text-primary mb-4 lg:mb-6 leading-tight">
        {title}
      </h1>

      {/* Metadata */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary font-noto-sans-jp">
        {/* Published Date */}
        {formattedPublishedAt && (
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            <time dateTime={publishedAt || ''}>{formattedPublishedAt}</time>
          </div>
        )}

        {/* Updated Date */}
        {showUpdatedAt && (
          <div className="flex items-center gap-1.5">
            <span className="text-text-secondary/60">更新:</span>
            <time dateTime={updatedAt}>{formattedUpdatedAt}</time>
          </div>
        )}

        {/* View Count */}
        <div className="flex items-center gap-1.5">
          <Eye className="w-4 h-4" />
          <span>{viewCount.toLocaleString()}</span>
        </div>
      </div>

      {/* Category Badges */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {categories.map((category) => (
            <CategoryBadge key={category.id} category={category} />
          ))}
        </div>
      )}
    </header>
  )
}
