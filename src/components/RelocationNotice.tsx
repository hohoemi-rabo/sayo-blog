import { ExternalLink, MapPin } from 'lucide-react'

interface RelocationNoticeProps {
  note: string | null
  url: string | null
}

/** 記事ページの写真の下に出す移転先の案内 (お店の状態が「移転」のときだけ) */
export default function RelocationNotice({ note, url }: RelocationNoticeProps) {
  return (
    <aside className="flex items-start gap-3 rounded-xl border border-border-decorative bg-white px-4 py-3 font-noto-sans-jp text-sm leading-relaxed text-text-primary sm:px-5">
      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0 space-y-1">
        <p className="font-semibold">こちらは移転されています</p>
        {note && <p className="text-text-secondary">{note}</p>}
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 break-all text-primary underline underline-offset-2"
          >
            移転先の情報を見る
            <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          </a>
        )}
      </div>
    </aside>
  )
}
