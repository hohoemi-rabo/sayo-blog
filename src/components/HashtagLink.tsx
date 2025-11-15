'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface HashtagLinkProps {
  slug: string
  name: string
  count: number
  fontSize: number
  index: number
}

const SCROLL_FLAG_KEY = 'pagination-should-scroll'

export default function HashtagLink({ slug, name, count, fontSize, index }: HashtagLinkProps) {
  const router = useRouter()

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()

    // Set flag for scroll restoration
    sessionStorage.setItem(SCROLL_FLAG_KEY, 'true')

    // Navigate without scrolling to top
    router.push(`/?hashtags=${slug}`, { scroll: false })
  }

  return (
    <Link
      href={`/?hashtags=${slug}`}
      onClick={handleClick}
      className="
        inline-block px-4 py-2 rounded-full
        border-2 border-border-decorative bg-background
        hover:border-primary hover:bg-primary/10 hover:scale-110 hover:shadow-md
        transition-all duration-200 ease-out
        font-noto-sans-jp font-medium text-text-primary
        animate-fade-in-up
      "
      style={{
        fontSize: `${fontSize}rem`,
        animationDelay: `${index * 30}ms`,
      }}
      aria-label={`${name} (${count}件の記事)`}
    >
      #{name}
    </Link>
  )
}
