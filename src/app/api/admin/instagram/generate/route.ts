import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { generateIgPosts } from '@/app/(admin)/admin/instagram/posts/actions'

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdminAuth()
  if (unauthorized) return unauthorized

  let body: { post_id?: string; count?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '不正な JSON' }, { status: 400 })
  }

  const postId = body.post_id
  const count = body.count ?? 1
  if (!postId) {
    return NextResponse.json({ error: 'post_id が必要です' }, { status: 400 })
  }

  const result = await generateIgPosts(postId, count)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({ items: result.data }, { status: 201 })
}
