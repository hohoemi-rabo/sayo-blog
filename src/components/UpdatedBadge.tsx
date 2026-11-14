import { cn } from '@/lib/utils'
import { formatDateStringDot } from '@/lib/post-updates'

/**
 * 「更新」の小さな印 (Ticket 46)。一覧のカード・最近更新された記事で共用。
 * date (YYYY-MM-DD) を渡すと、読み上げとマウスオーバーで最終更新日が分かる。
 * hook を使わないので Server / Client どちらのカードからも使える
 *
 * 色は深い青緑 (teal-700)。サイトのピンク・カテゴリの色 (橙・黄・水色・藍・茶・緑・紫) と重ならない色を選んだ
 * (2026-11-14。ピンクだとカテゴリのバッジやサイトの色に埋もれた)。白文字とのコントラストは約 5.5:1
 */
export default function UpdatedBadge({ date, className }: { date?: string; className?: string }) {
  const label = date ? `最終更新 ${formatDateStringDot(date)}` : undefined
  return (
    <span
      title={label}
      aria-label={label}
      className={cn(
        'shrink-0 whitespace-nowrap rounded-full bg-teal-700 px-2 py-0.5 text-[10px] font-medium leading-normal text-white',
        className
      )}
    >
      更新
    </span>
  )
}
