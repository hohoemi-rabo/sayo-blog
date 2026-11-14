'use client'

import { RefreshCw, ChevronRight } from 'lucide-react'
import { UPDATE_HISTORY_ANCHOR_ID, formatDateStringDot } from '@/lib/post-updates'

interface ArticleUpdateNoticeProps {
  /** 最新の履歴 (日付 YYYY-MM-DD と内容) */
  latest: { updated_on: string; note: string }
}

/**
 * 写真の下の「この記事は随時情報を更新しています」の帯 (Ticket 46)。
 * 「更新履歴を見る」で本文の後ろの更新履歴までなめらかにスクロールする。
 * 履歴は折りたたみ本文 (ExpandableArticleBody) の外にあるので、本文を開かなくても届く。
 */
export function ArticleUpdateNotice({ latest }: ArticleUpdateNoticeProps) {
  const scrollToHistory = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById(UPDATE_HISTORY_ANCHOR_ID)
    if (!target) return // 見つからなければ普通のアンカー移動に任せる
    e.preventDefault()
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // 止まる位置はヘッダーの高さぶん下げてある (履歴側の scroll-mt)
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    // URL にも残す (戻る・共有で同じ位置に来られる)。スクロールはさせない
    history.replaceState(null, '', `#${UPDATE_HISTORY_ANCHOR_ID}`)
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
      <div className="flex flex-1 items-start gap-3">
        <RefreshCw className="mt-0.5 h-6 w-6 shrink-0 text-primary/70" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-noto-serif-jp text-base font-bold text-text-primary sm:text-lg">
            この記事は随時情報を更新しています
          </p>
          <p className="mt-1 font-noto-sans-jp text-sm leading-relaxed text-text-secondary">
            <span className="mr-2 whitespace-nowrap">{formatDateStringDot(latest.updated_on)}</span>
            {latest.note}
          </p>
        </div>
      </div>
      <a
        href={`#${UPDATE_HISTORY_ANCHOR_ID}`}
        onClick={scrollToHistory}
        className="inline-flex shrink-0 items-center justify-center gap-1 self-start rounded-full border border-primary/50 bg-white px-4 py-2 font-noto-sans-jp text-sm text-primary transition-colors hover:bg-primary/10 sm:self-center"
      >
        更新履歴を見る
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </a>
    </div>
  )
}
