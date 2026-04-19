import type { IgPostStatus } from '@/lib/types'

export type IgPostStatusFilter = IgPostStatus | 'all'

const STATUS_CHOICES: IgPostStatus[] = ['draft', 'published', 'manual_published']

export function parseIgPostStatus(raw?: string | null): IgPostStatusFilter {
  if (!raw) return 'all'
  if (raw === 'all') return 'all'
  return (STATUS_CHOICES as string[]).includes(raw)
    ? (raw as IgPostStatus)
    : 'all'
}
