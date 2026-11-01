import Link from 'next/link'
import { hashtagPath } from '@/lib/seo-utils'

interface HashtagLinkProps {
  slug: string
  name: string
  count: number
  fontSize: number
  index: number
}

/**
 * 人気タグのリンク。通常のページ移動 = 先頭 (絞り込みバー + 結果) へ戻る。
 * 以前は scroll: false で移動していたが、タグの一覧は記事一覧より下にあるため、
 * 押しても画面が下に残ったまま上の一覧だけ入れ替わり、絞り込めたことが分からなかった。
 */
export default function HashtagLink({ slug, name, count, fontSize, index }: HashtagLinkProps) {
  return (
    <Link
      href={hashtagPath(slug)}
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
