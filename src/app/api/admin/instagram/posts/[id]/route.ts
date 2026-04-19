import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import {
  updateIgPost,
  deleteIgPost,
  markIgPostManualPublished,
} from '@/app/(admin)/admin/instagram/posts/actions'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const unauthorized = await requireAdminAuth()
  if (unauthorized) return unauthorized

  const { id } = await params

  let body: {
    caption?: string
    hashtags?: string[]
    image_url?: string | null
    status?: 'draft' | 'published' | 'manual_published'
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '不正な JSON' }, { status: 400 })
  }

  // Status change handled by a dedicated action (keeps instagram_published_at logic in one place).
  if (body.status === 'manual_published') {
    const result = await markIgPostManualPublished(id)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json({ success: true })
  }

  const result = await updateIgPost(id, {
    caption: body.caption,
    hashtags: body.hashtags,
    image_url: body.image_url,
  })
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const unauthorized = await requireAdminAuth()
  if (unauthorized) return unauthorized

  const { id } = await params
  const result = await deleteIgPost(id)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}
