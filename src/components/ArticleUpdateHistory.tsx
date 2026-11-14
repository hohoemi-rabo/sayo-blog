import { History } from 'lucide-react'
import { UPDATE_HISTORY_ANCHOR_ID, formatDateStringDot, type PostUpdateEntry } from '@/lib/post-updates'
import { formatDotDate } from '@/lib/home-posts'

interface ArticleUpdateHistoryProps {
  /** 新しい順 */
  updates: PostUpdateEntry[]
  publishedAt?: string | null
}

/**
 * 本文の後ろに出す更新履歴 (Ticket 46)。全記事に出す (履歴が無ければ「初回掲載」の 1 行だけ)。
 * 一番下の「初回掲載」の行は公開日から自動で作る (DB には持たない = 公開日を直せば表示もついてくる)。
 * 写真の下の帯 (ArticleUpdateNotice) は、実際に更新した記事だけ。
 */
export function ArticleUpdateHistory({ updates, publishedAt }: ArticleUpdateHistoryProps) {
  return (
    <section
      aria-labelledby={UPDATE_HISTORY_ANCHOR_ID}
      className="mt-12 overflow-hidden rounded-2xl border border-primary/20 bg-white"
    >
      <h2
        id={UPDATE_HISTORY_ANCHOR_ID}
        // 固定ヘッダー (h-16 / md:h-20) に隠れない位置で止める
        className="flex scroll-mt-24 items-center gap-2 bg-primary/5 px-5 py-3 font-noto-serif-jp text-lg font-bold text-text-primary md:scroll-mt-28"
      >
        <History className="h-5 w-5 text-primary/70" aria-hidden="true" />
        更新履歴
      </h2>
      <ol className="divide-y divide-border-decorative/50 px-5 font-noto-sans-jp text-sm">
        {updates.map((u, i) => (
          <li key={`${u.updated_on}-${i}`} className="flex gap-4 py-3">
            <time dateTime={u.updated_on} className="w-20 shrink-0 text-text-secondary">
              {formatDateStringDot(u.updated_on)}
            </time>
            <span className="text-text-primary">{u.note}</span>
          </li>
        ))}
        {publishedAt && (
          <li className="flex gap-4 py-3">
            <time dateTime={publishedAt} className="w-20 shrink-0 text-text-secondary">
              {formatDotDate(publishedAt)}
            </time>
            <span className="text-text-primary">初回掲載</span>
          </li>
        )}
      </ol>
    </section>
  )
}
