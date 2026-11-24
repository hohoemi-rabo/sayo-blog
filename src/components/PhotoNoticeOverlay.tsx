import type { PhotoNotice } from '@/lib/place-status'

interface PhotoNoticeOverlayProps {
  notice: PhotoNotice
  mode: 'card' | 'hero'
}

/** カードでは短い一言、記事ページの写真では下部の帯に全文 */
const NOTICES: Record<PhotoNotice, { icon: string; short: string; full: string }> = {
  event_ended: {
    icon: '📅',
    short: 'このイベントは終了しています',
    full: '記事内でご紹介している開催回は終了しています。継続開催されるイベントについては、最新の日程・内容を主催者さまの公式情報などでご確認ください。',
  },
  closed: {
    icon: '🏪',
    short: '閉店されています',
    full: 'こちらは閉店されています。記事は掲載当時の内容です。',
  },
  relocated: {
    icon: '📍',
    short: '移転されています',
    full: '移転されています',
  },
}

/**
 * 記事の写真に重ねる案内 (イベント終了 / 閉店 / 移転)。どれを出すかは `place-status.ts::photoNoticeOf`。
 * 終了・閉店は写真を暗くして中央 (記事ページは下部の帯)、移転は今も行けるので写真を隠さない小さな札だけ
 * (移転先は記事ページの写真の下に `RelocationNotice` で出す)。写真の白黒化は呼び出し側 (`isGrayscaleNotice`)。
 */
export default function PhotoNoticeOverlay({ notice, mode }: PhotoNoticeOverlayProps) {
  const { icon, short, full } = NOTICES[notice]

  if (notice === 'relocated') {
    return (
      <div
        className={
          mode === 'card'
            ? 'pointer-events-none absolute bottom-3 left-3 z-10'
            : 'pointer-events-none absolute bottom-4 left-4 z-10 sm:bottom-6 sm:left-6'
        }
      >
        <span className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-noto-sans-jp font-semibold text-text-primary shadow-lg backdrop-blur-sm sm:text-sm">
          <span aria-hidden>{icon}</span>
          <span>{short}</span>
        </span>
      </div>
    )
  }

  if (mode === 'card') {
    return (
      <div
        aria-label={short}
        className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45"
      >
        <div className="flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-noto-sans-jp font-semibold text-white shadow-lg backdrop-blur-sm">
          <span aria-hidden>{icon}</span>
          <span>{short}</span>
        </div>
      </div>
    )
  }

  return (
    <div aria-label={short} className="pointer-events-none absolute inset-0 flex items-end bg-black/35">
      <div className="w-full bg-black/70 px-4 py-3 text-white backdrop-blur-sm sm:px-6 sm:py-4">
        <p className="flex items-start gap-2 text-xs font-noto-sans-jp leading-relaxed sm:text-sm">
          <span aria-hidden className="shrink-0 pt-0.5">{icon}</span>
          <span>{full}</span>
        </p>
      </div>
    </div>
  )
}
