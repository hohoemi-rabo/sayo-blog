import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import {
  createIgSource,
  getIgSources,
  type IgSourceInput,
} from '@/app/(admin)/admin/instagram/sources/actions'
import {
  parseIgActiveFilter,
  parseIgPermissionStatus,
} from '@/app/(admin)/admin/instagram/sources/filters'

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdminAuth()
  if (unauthorized) return unauthorized

  const { searchParams } = req.nextUrl
  const result = await getIgSources({
    permission_status: parseIgPermissionStatus(searchParams.get('permission_status')),
    is_active: parseIgActiveFilter(searchParams.get('is_active')),
    category_slug: searchParams.get('category_slug') ?? undefined,
    q: searchParams.get('q') ?? undefined,
    limit: safeInt(searchParams.get('limit'), 200),
    offset: safeInt(searchParams.get('offset'), 0),
  })

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdminAuth()
  if (unauthorized) return unauthorized

  let body: Partial<IgSourceInput>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '不正な JSON' }, { status: 400 })
  }

  if (typeof body.ig_username !== 'string' || typeof body.display_name !== 'string') {
    return NextResponse.json(
      { error: 'ig_username と display_name が必要です' },
      { status: 400 }
    )
  }
  if (typeof body.permission_status !== 'string') {
    return NextResponse.json(
      { error: 'permission_status が必要です' },
      { status: 400 }
    )
  }

  const result = await createIgSource(body as IgSourceInput)
  if (!result.success) {
    const status = result.code === 'duplicate' ? 409 : 400
    return NextResponse.json({ error: result.error }, { status })
  }
  return NextResponse.json({ data: result.data }, { status: 201 })
}

function safeInt(raw: string | null, fallback: number): number {
  if (!raw) return fallback
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}
