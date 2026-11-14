import Link from 'next/link'
import { Calendar, Eye } from 'lucide-react'
import { Category, Hashtag } from '@/lib/types'
import CategoryBadge from './CategoryBadge'
import { hashtagPath } from '@/lib/seo-utils'
import { formatDotDate } from '@/lib/home-posts'
import { formatDateStringDot } from '@/lib/post-updates'

interface ArticleMetaProps {
  categories: Category[]
  hashtags: Hashtag[]
  publishedAt?: string | null
  /** 更新履歴の最新日 (YYYY-MM-DD)。記事の頭の「最終更新」と同じ値 */
  lastUpdatedOn: string | null
  viewCount: number
}

export default function ArticleMeta({
  categories,
  hashtags,
  publishedAt,
  lastUpdatedOn,
  viewCount,
}: ArticleMetaProps) {
  // 日付は日本時間 (記事の頭と同じ書き方)
  const formattedPublishedAt = formatDotDate(publishedAt)

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
                href={hashtagPath(hashtag.slug)}
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
            <span>初回掲載</span>
            <time dateTime={publishedAt || ''}>{formattedPublishedAt}</time>
          </div>
        )}

        {/* Updated Date */}
        {lastUpdatedOn && (
          <div className="flex items-center gap-1.5">
            <span>最終更新</span>
            <time dateTime={lastUpdatedOn}>{formatDateStringDot(lastUpdatedOn)}</time>
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
