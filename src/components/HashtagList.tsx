import Link from 'next/link'
import { Hashtag } from '@/lib/types'

interface HashtagListProps {
  hashtags: Hashtag[]
  maxDisplay?: number
  className?: string
}

export default function HashtagList({
  hashtags,
  maxDisplay = 3,
  className = '',
}: HashtagListProps) {
  if (!hashtags || hashtags.length === 0) return null

  const displayHashtags = hashtags.slice(0, maxDisplay)
  const remainingCount = hashtags.length - maxDisplay

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {displayHashtags.map((hashtag) => (
        <Link
          key={hashtag.slug}
          href={`/?hashtags=${hashtag.slug}`}
          className="inline-flex items-center px-2 py-1 rounded-md text-xs font-noto-sans-jp text-text-secondary border border-border-decorative hover:border-primary hover:text-primary hover:bg-primary/5 transition-all duration-200"
        >
          #{hashtag.name}
        </Link>
      ))}
      {remainingCount > 0 && (
        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-noto-sans-jp text-text-secondary border border-border-decorative">
          +{remainingCount}
        </span>
      )}
    </div>
  )
}
