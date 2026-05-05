import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import {
  deleteImport,
  updateImportStatus,
  updateSelectedImages,
} from '@/app/(admin)/admin/instagram/imports/actions'
import type { IgImportedStatus } from '@/lib/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

const ALLOWED_STATUSES: IgImportedStatus[] = [
  'pending',
  'processing',
  'published',
  'skipped',
]

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const unauthorized = await requireAdminAuth()
  if (unauthorized) return unauthorized

  const { id } = await params

  let body: {
    status?: IgImportedStatus
    selected_image_indexes?: number[] | null
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '不正な JSON' }, { status: 400 })
  }

  if (body.status !== undefined) {
    if (!ALLOWED_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: '不正な status' }, { status: 400 })
    }
    const result = await updateImportStatus(id, body.status)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
  }

  if (body.selected_image_indexes !== undefined) {
    const value = body.selected_image_indexes
    if (value !== null) {
      if (
        !Array.isArray(value) ||
        !value.every(
          (n) => typeof n === 'number' && Number.isInteger(n) && n >= 0
        )
      ) {
        return NextResponse.json(
          { error: 'selected_image_indexes は 0 以上の整数配列が必要です' },
          { status: 400 }
        )
      }
    }
    const result = await updateSelectedImages(id, value)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const unauthorized = await requireAdminAuth()
  if (unauthorized) return unauthorized

  const { id } = await params
  const result = await deleteImport(id)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}
