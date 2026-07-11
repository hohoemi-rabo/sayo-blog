import { FileText } from 'lucide-react'
import { isPdfAttachment } from '@/lib/inquiries'

/**
 * 依頼フォームの添付 (チラシ・写真) を一覧表示する。
 * 公開フォームは画像と PDF を同じ image_urls に混ぜて保存するため、
 * PDF は <img> にせずファイルチップとして出す。Server / Client 両方から使える。
 */
export function InquiryAttachments({ urls }: { urls: string[] }) {
  if (urls.length === 0) {
    return <span className="text-text-secondary">なし</span>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {urls.map((url) =>
        isPdfAttachment(url) ? (
          <a
            key={url}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-border-decorative bg-background text-primary transition-colors hover:border-primary"
          >
            <FileText className="h-6 w-6" />
            <span className="text-[10px] font-medium">PDF</span>
          </a>
        ) : (
          <a
            key={url}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block h-20 w-20 overflow-hidden rounded-lg border border-border-decorative"
          >
            {/* 管理画面内サムネのため next/image は使わない */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" />
          </a>
        )
      )}
    </div>
  )
}
