import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import {
  deleteIgSource,
  updateIgSource,
  type IgSourceInput,
} from '@/app/(admin)/admin/instagram/sources/actions'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const unauthorized = await requireAdminAuth()
  if (unauthorized) return unauthorized

  const { id } = await params

  let body: Partial<IgSourceInput>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '不正な JSON' }, { status: 400 })
  }

  const result = await updateIgSource(id, body)
  if (!result.success) {
    const status =
      result.code === 'duplicate' ? 409 : result.code === 'not_found' ? 404 : 400
    return NextResponse.json({ error: result.error }, { status })
  }
  return NextResponse.json({ data: result.data })
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const unauthorized = await requireAdminAuth()
  if (unauthorized) return unauthorized

  const { id } = await params
  const result = await deleteIgSource(id)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}
