import type { IgPermissionStatus } from '@/lib/types'

export type IgPermissionFilter = IgPermissionStatus | 'all'
export type IgActiveFilter = 'all' | 'active' | 'inactive'

const PERMISSION_CHOICES: IgPermissionStatus[] = [
  'not_requested',
  'requested',
  'approved',
  'denied',
]

export function parseIgPermissionStatus(raw?: string | null): IgPermissionFilter {
  if (!raw || raw === 'all') return 'all'
  return (PERMISSION_CHOICES as string[]).includes(raw)
    ? (raw as IgPermissionStatus)
    : 'all'
}

export function parseIgActiveFilter(raw?: string | null): IgActiveFilter {
  if (raw === 'active' || raw === 'inactive') return raw
  return 'all'
}
