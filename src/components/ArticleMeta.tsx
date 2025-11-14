import Link from 'next/link'
import { Calendar, Eye } from 'lucide-react'
import { Category, Hashtag } from '@/lib/types'
import CategoryBadge from './CategoryBadge'

interface ArticleMetaProps {
  categories: Category[]
  hashtags: Hashtag[]
  publishedAt?: string | null
  updatedAt: string
  viewCount: number
}

export default function ArticleMeta({
  categories,
  hashtags,
  publishedAt,
  updatedAt,
  viewCount,
}: ArticleMetaProps) {
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
    <footer className="mt-12 pt-8 border-t border-border-decorative">
      {/* Hashtags */}
      {hashtags.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-text-secondary font-noto-sans-jp mb-3">
            タグ
          </h3>
          <div className="flex flex-wrap gap-2">
            {hashtags.map((hashtag) => (
              <Link
                key={hashtag.id}
                href={`/?hashtags=${hashtag.slug}`}
                className="inline-flex items-center px-3 py-1.5 bg-background-dark/5
                  hover:bg-primary/10 text-text-secondary hover:text-primary
                  rounded-full text-sm font-noto-sans-jp transition-colors"
              >
                #{hashtag.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-text-secondary font-noto-sans-jp mb-3">
            カテゴリー
          </h3>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <CategoryBadge key={category.id} category={category} />
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary font-noto-sans-jp">
        {/* Published Date */}
        {formattedPublishedAt && (
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            <span>公開:</span>
            <time dateTime={publishedAt || ''}>{formattedPublishedAt}</time>
          </div>
        )}

        {/* Updated Date */}
        {showUpdatedAt && (
          <div className="flex items-center gap-1.5">
            <span>更新:</span>
            <time dateTime={updatedAt}>{formattedUpdatedAt}</time>
          </div>
        )}

        {/* View Count */}
        <div className="flex items-center gap-1.5">
          <Eye className="w-4 h-4" />
          <span>{viewCount.toLocaleString()}回閲覧</span>
        </div>
      </div>
    </footer>
  )
}
