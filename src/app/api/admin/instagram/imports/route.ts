import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { getIgImportedPosts } from '@/app/(admin)/admin/instagram/imports/actions'
import {
  parseIgImportedSort,
  parseIgImportedStatus,
} from '@/app/(admin)/admin/instagram/imports/filters'

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdminAuth()
  if (unauthorized) return unauthorized

  const { searchParams } = req.nextUrl
  const status = parseIgImportedStatus(searchParams.get('status'))
  const sort = parseIgImportedSort(searchParams.get('sort'))
  const sourceId = searchParams.get('source_id')?.trim() || undefined
  const q = searchParams.get('q')?.trim() || undefined
  const pageRaw = Number(searchParams.get('page') ?? '1')
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1

  const result = await getIgImportedPosts({
    status,
    source_id: sourceId,
    q,
    sort,
    page,
  })

  return NextResponse.json(result)
}
