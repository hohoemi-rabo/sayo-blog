import Image from 'next/image'
import Link from 'next/link'
import CategoryBadge from './CategoryBadge'
import HashtagList from './HashtagList'
import { PostWithRelations } from '@/lib/types'

interface PostCardProps {
  post: PostWithRelations
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays <= 1) return '今日'
  if (diffDays <= 7) return `${diffDays}日前`
  if (diffDays <= 30) return `${Math.floor(diffDays / 7)}週間前`

  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function PostCard({ post }: PostCardProps) {
  // Get the first category (flat structure now)
  const category = post.post_categories?.[0]?.categories

  // Get hashtags
  const hashtags =
    post.post_hashtags
      ?.map((ph) => ph.hashtags)
      .filter((h): h is NonNullable<typeof h> => h !== null) || []

  // Generate post URL (category/slug)
  const postUrl = category ? `/${category.slug}/${post.slug}` : `/${post.slug}`

  return (
    <article className="group bg-background rounded-xl overflow-hidden shadow-decorative hover:shadow-decorative-lg transition-all duration-300">
      {/* Thumbnail */}
      <Link href={postUrl} className="block relative aspect-[4/3] overflow-hidden bg-background-dark/5">
        {post.thumbnail_url ? (
          <Image
            src={post.thumbnail_url}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-secondary">
            <svg
              className="w-16 h-16 opacity-30"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
        {/* Category Badge Overlay */}
        {category && (
          <div className="absolute top-3 left-3">
            <CategoryBadge category={category} />
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="p-5">
        <Link href={postUrl}>
          <h3 className="font-playfair text-xl font-bold text-text-primary line-clamp-2 mb-2 group-hover:text-primary transition-colors duration-200 hover:text-primary">
            {post.title}
          </h3>
        </Link>

        {post.excerpt && (
          <p className="text-text-secondary text-sm font-noto-serif-jp line-clamp-3 mb-3 leading-relaxed">
            {post.excerpt}
          </p>
        )}

        {hashtags.length > 0 && <HashtagList hashtags={hashtags} maxDisplay={3} className="mb-3" />}

        {/* Meta info */}
        <div className="flex items-center gap-4 text-xs text-text-secondary font-noto-sans-jp">
          <time dateTime={post.published_at || post.created_at}>
            {formatDate(post.published_at || post.created_at)}
          </time>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            {post.view_count?.toLocaleString() || 0}
          </span>
        </div>
      </div>
    </article>
  )
}
