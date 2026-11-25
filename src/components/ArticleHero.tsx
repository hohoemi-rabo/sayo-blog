import type { ReactNode } from 'react'
import Image from 'next/image'
import { CalendarDays, CalendarClock, Eye } from 'lucide-react'
import { Category } from '@/lib/types'
import CategoryBadge from './CategoryBadge'
import PhotoNoticeOverlay from './PhotoNoticeOverlay'
import RelocationNotice from './RelocationNotice'
import { isGrayscaleNotice, photoNoticeOf } from '@/lib/place-status'
import { formatDotDate } from '@/lib/home-posts'
import { formatDateStringDot } from '@/lib/post-updates'

interface ArticleHeroProps {
  title: string
  thumbnail?: string | null
  categories: Category[]
  publishedAt?: string | null
  /** 更新履歴の最新日 (YYYY-MM-DD)。初回掲載日より後のときだけ渡る。無ければ「最終更新」を出さない */
  lastUpdatedOn: string | null
  viewCount: number
  eventEnded?: boolean
  /** お店の状態 (閉店 / 移転)。移転なら写真の下に移転先を出す */
  placeStatus?: string | null
  relocationNote?: string | null
  relocationUrl?: string | null
  /** 閉店のお知らせ文。閉店のときだけ写真の帯に出す (空なら決まり文) */
  closureNote?: string | null
  /** 写真のすぐ下に出すもの (更新のお知らせの帯) */
  belowImage?: ReactNode
}

/**
 * 記事ページの頭。タイトル → 初回掲載 / 最終更新 → カテゴリ → 写真 の順 (Ticket 46 で写真の上にタイトルを移した)。
 * 日付は日本時間で出す (サーバーは UTC なので new Date().getDate() だと夜中の公開が前日になる)。
 */
export default function ArticleHero({
  title,
  thumbnail,
  categories,
  publishedAt,
  lastUpdatedOn,
  viewCount,
  eventEnded = false,
  placeStatus = 'open',
  relocationNote = null,
  relocationUrl = null,
  closureNote = null,
  belowImage,
}: ArticleHeroProps) {
  const notice = photoNoticeOf({ event_ended: eventEnded, place_status: placeStatus })
  const dimmed = isGrayscaleNotice(notice)
  const relocated = placeStatus === 'relocated'
  return (
    <header className="mb-8 lg:mb-12">
      <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-playfair font-bold text-text-primary leading-tight">
        {title}
      </h1>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-text-secondary font-noto-sans-jp">
        {publishedAt && (
          <div className="flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4" aria-hidden="true" />
            <span>初回掲載</span>
            <time dateTime={publishedAt}>{formatDotDate(publishedAt)}</time>
          </div>
        )}

        {lastUpdatedOn && (
          <>
            {publishedAt && (
              <span className="hidden sm:inline text-border-decorative" aria-hidden="true">
                |
              </span>
            )}
            <div className="flex items-center gap-1.5">
              <CalendarClock className="w-4 h-4" aria-hidden="true" />
              <span>最終更新</span>
              <time dateTime={lastUpdatedOn}>{formatDateStringDot(lastUpdatedOn)}</time>
            </div>
          </>
        )}

        <div className="flex items-center gap-1.5">
          <Eye className="w-4 h-4" aria-hidden="true" />
          <span>{viewCount.toLocaleString()}</span>
        </div>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {categories.map((category) => (
            <CategoryBadge key={category.id} category={category} />
          ))}
        </div>
      )}

      {thumbnail && (
        <div className="relative aspect-[16/9] w-full mt-6 rounded-2xl overflow-hidden shadow-decorative-lg">
          <Image
            src={thumbnail}
            alt={title}
            fill
            className={`object-cover ${dimmed ? 'grayscale' : ''}`}
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 80vw, 70vw"
          />
          {!dimmed && (
            <div className="absolute inset-0 bg-gradient-to-t from-background-dark/60 via-transparent to-transparent" />
          )}
          {notice && (
            <PhotoNoticeOverlay
              notice={notice}
              mode="hero"
              fullText={notice === 'closed' ? closureNote : null}
            />
          )}
        </div>
      )}

      {relocated && (
        <div className="mt-6">
          <RelocationNotice note={relocationNote} url={relocationUrl} />
        </div>
      )}

      {belowImage && <div className="mt-6">{belowImage}</div>}
    </header>
  )
}
