import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import {
  generateArticleFromIg,
  IgArticleValidationError,
} from '@/lib/ig-article-generator'

// Gemini calls can take 10-30 seconds. Allow up to 60 to be safe.
export const maxDuration = 60

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(_req: NextRequest, { params }: RouteContext) {
  const unauthorized = await requireAdminAuth()
  if (unauthorized) return unauthorized

  const { id } = await params

  try {
    const result = await generateArticleFromIg(id)
    return NextResponse.json({
      success: true,
      post_id: result.post_id,
      is_event: result.is_event,
      redirect: `/admin/posts/${result.post_id}`,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error'
    const status = err instanceof IgArticleValidationError ? 400 : 500
    if (status === 500) {
      console.error('[POST /api/admin/instagram/imports/[id]/generate]', err)
    }
    return NextResponse.json({ error: message }, { status })
  }
}
