interface EventEndedOverlayProps {
  mode: 'card' | 'hero'
}

const FULL_NOTICE =
  '記事内でご紹介している開催回は終了しています。継続開催されるイベントについては、最新の日程・内容を主催者さまの公式情報などでご確認ください。'

export default function EventEndedOverlay({ mode }: EventEndedOverlayProps) {
  if (mode === 'card') {
    return (
      <div
        aria-label="このイベントは終了しています"
        className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45"
      >
        <div className="flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-noto-sans-jp font-semibold text-white shadow-lg backdrop-blur-sm">
          <span aria-hidden>📅</span>
          <span>このイベントは終了しています</span>
        </div>
      </div>
    )
  }

  return (
    <div
      aria-label="このイベントは終了しています"
      className="pointer-events-none absolute inset-0 flex items-end bg-black/35"
    >
      <div className="w-full bg-black/70 px-4 py-3 text-white backdrop-blur-sm sm:px-6 sm:py-4">
        <p className="flex items-start gap-2 text-xs font-noto-sans-jp leading-relaxed sm:text-sm">
          <span aria-hidden className="shrink-0 pt-0.5">📅</span>
          <span>{FULL_NOTICE}</span>
        </p>
      </div>
    </div>
  )
}
