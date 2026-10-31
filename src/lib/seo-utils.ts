import type { Metadata } from 'next'
import { SITE_CONFIG } from '@/lib/site-config'

type OpenGraph = NonNullable<Metadata['openGraph']>

/** サイト共通の共有画像 (サムネイルの無いページ用) */
export const DEFAULT_OG_IMAGES = [
  {
    url: SITE_CONFIG.ogImage.path,
    width: SITE_CONFIG.ogImage.width,
    height: SITE_CONFIG.ogImage.height,
    alt: SITE_CONFIG.name,
  },
]

/**
 * ページごとの openGraph にサイト共通の値 (サイト名・言語・共有画像) を足す。
 * Next.js はページで openGraph を書くと layout の openGraph を丸ごと置き換えるので、
 * これを通さないと og:image や og:site_name が消える (About・LP で実際に消えていた)。
 */
export function withSiteOpenGraph(og: OpenGraph): OpenGraph {
  return {
    type: 'website',
    siteName: SITE_CONFIG.name,
    locale: SITE_CONFIG.locale,
    images: DEFAULT_OG_IMAGES,
    ...og,
  }
}

/**
 * Truncate text to maxLength without cutting words in half.
 * Appends ellipsis if truncated.
 */
export function truncateDescription(text: string, maxLength: number = 155): string {
  if (!text) return SITE_CONFIG.description
  if (text.length <= maxLength) return text

  // For Japanese text, character-level truncation is acceptable
  const truncated = text.slice(0, maxLength - 1)

  // Try to find a natural break point (period, comma, space)
  const lastBreak = Math.max(
    truncated.lastIndexOf('。'),
    truncated.lastIndexOf('、'),
    truncated.lastIndexOf(' '),
    truncated.lastIndexOf('\n')
  )

  if (lastBreak > maxLength * 0.7) {
    return truncated.slice(0, lastBreak + 1)
  }

  return truncated + '…'
}

/**
 * Build a full canonical URL from a relative path.
 * Removes trailing slash for consistency.
 */
/**
 * 記事の公開パス。末尾スラッシュは付けない (付けると本番で 308 リダイレクトされ、
 * canonical・サイトマップがリダイレクト先を指す = Search Console で「リダイレクトあり」になる)。
 * 日本語 slug はエンコードする (サイトマップの <loc> は正しい URL である必要がある)。
 */
export function articlePath(categorySlug: string | null | undefined, slug: string): string {
  const encoded = encodeURIComponent(slug)
  return categorySlug ? `/${categorySlug}/${encoded}` : `/${encoded}`
}

export function generateCanonicalUrl(path: string): string {
  const base = SITE_CONFIG.url.replace(/\/$/, '')
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${base}${cleanPath}`
}

/**
 * Convert hashtag objects to a comma-separated keywords string.
 */
export function extractKeywords(
  hashtags: Array<{ name: string }>,
  additionalKeywords?: string[]
): string[] {
  const hashtagNames = hashtags.map((h) => h.name)
  return [...(additionalKeywords || SITE_CONFIG.keywords), ...hashtagNames]
}
