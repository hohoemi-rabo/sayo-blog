'use client'

import { ClipboardList } from 'lucide-react'
import type { IgSource } from '@/lib/types'

interface CoworkPromptDownloadButtonProps {
  source: IgSource
}

export function CoworkPromptDownloadButton({
  source,
}: CoworkPromptDownloadButtonProps) {
  const enabled =
    source.permission_status === 'approved' && source.is_active

  const className =
    'inline-flex h-9 items-center justify-center gap-1 rounded-xl border px-4 text-sm font-medium transition-all disabled:opacity-50 disabled:pointer-events-none'

  if (!enabled) {
    return (
      <button
        type="button"
        disabled
        className={`${className} border-border-decorative bg-background text-text-secondary`}
        title="許可済み + 取得有効 のアカウントのみ Cowork 指示書を生成できます"
      >
        <ClipboardList className="h-3.5 w-3.5" />
        Cowork 指示書
      </button>
    )
  }

  return (
    <a
      href={`/admin/instagram/sources/${source.id}/cowork-prompt.txt`}
      download={`cowork-prompt-${source.ig_username}.txt`}
      className={`${className} border-border-decorative bg-background text-text-primary hover:bg-background-dark/5`}
    >
      <ClipboardList className="h-3.5 w-3.5" />
      Cowork 指示書
    </a>
  )
}
