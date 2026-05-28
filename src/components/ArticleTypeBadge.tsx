import type { ArticleType } from '@/lib/types'

interface Props {
  articleType: ArticleType
  className?: string
}

const STYLES: Record<
  Exclude<ArticleType, 'free'>,
  { label: string; className: string; title: string }
> = {
  mini: {
    label: '📩 ミニ記事',
    className: 'bg-blue-50 text-blue-700 border border-blue-200',
    title: '読者から寄せられた情報をもとに紗代が書いた紹介記事です',
  },
  long: {
    label: '✍️ 取材記事',
    className: 'bg-purple-50 text-purple-700 border border-purple-200',
    title: '紗代が現地に伺って書いた取材記事です',
  },
}

/**
 * 公開記事ページのヘッダー部に表示する出自バッジ。
 * `free` は読者向けに装飾しない（バッジを描画しない）。
 */
export function ArticleTypeBadge({ articleType, className = '' }: Props) {
  if (articleType === 'free') return null
  const style = STYLES[articleType]
  if (!style) return null
  return (
    <span
      title={style.title}
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium font-noto-sans-jp ${style.className} ${className}`}
    >
      {style.label}
    </span>
  )
}
