import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { InquiryCounts, InquiryTab } from '../filters'

interface Props {
  activeTab: InquiryTab
  counts: InquiryCounts
}

export function InquiriesTabs({ activeTab, counts }: Props) {
  const tabs = [
    {
      key: 'mini' as const,
      label: 'ミニ記事',
      href: '/admin/inquiries?tab=mini',
      total: counts.miniTotal,
      pending: counts.miniPending,
    },
    {
      key: 'long' as const,
      label: 'ロング記事',
      href: '/admin/inquiries?tab=long',
      total: counts.longTotal,
      pending: counts.longPending,
    },
  ]

  return (
    <div className="flex gap-1 border-b border-border-decorative">
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={cn(
              'relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'border-b-2 border-primary text-primary'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            {tab.label}
            <span className="text-xs text-text-secondary">{tab.total}</span>
            {tab.pending > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-white">
                {tab.pending}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
