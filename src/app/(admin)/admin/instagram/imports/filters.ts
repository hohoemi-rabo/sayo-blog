import type { IgImportedStatus } from '@/lib/types'

export type IgImportedStatusFilter = IgImportedStatus | 'all'
export type IgImportedSort = 'latest' | 'likes'

export const IMPORTS_PAGE_SIZE = 24

const STATUS_CHOICES: IgImportedStatus[] = [
  'pending',
  'processing',
  'published',
  'skipped',
]

export function parseIgImportedStatus(raw?: string | null): IgImportedStatusFilter {
  if (!raw || raw === 'all') return 'all'
  return (STATUS_CHOICES as string[]).includes(raw)
    ? (raw as IgImportedStatus)
    : 'all'
}

export function parseIgImportedSort(raw?: string | null): IgImportedSort {
  return raw === 'likes' ? 'likes' : 'latest'
}

function firstString(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0]
  return v
}

export interface ImportsFilter {
  status: IgImportedStatusFilter
  source_id?: string
  q?: string
  sort: IgImportedSort
  page: number
}

export function parseFilters(
  sp: Record<string, string | string[] | undefined>
): ImportsFilter {
  const pageRaw = Number(firstString(sp.page) ?? '1')
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1
  const sourceId = firstString(sp.source_id)?.trim() || undefined
  const q = firstString(sp.q)?.trim() || undefined

  return {
    status: parseIgImportedStatus(firstString(sp.status)),
    source_id: sourceId,
    q,
    sort: parseIgImportedSort(firstString(sp.sort)),
    page,
  }
}
