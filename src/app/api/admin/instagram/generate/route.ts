import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { generateIgPosts } from '@/app/(admin)/admin/instagram/posts/actions'

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdminAuth()
  if (unauthorized) return unauthorized

  let body: { post_id?: string; section_indexes?: number[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '不正な JSON' }, { status: 400 })
  }

  const postId = body.post_id
  const sectionIndexes = Array.isArray(body.section_indexes)
    ? body.section_indexes.filter(
        (v): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0
      )
    : []

  if (!postId) {
    return NextResponse.json({ error: 'post_id が必要です' }, { status: 400 })
  }
  if (sectionIndexes.length === 0) {
    return NextResponse.json(
      { error: 'section_indexes (number[]) が必要です' },
      { status: 400 }
    )
  }

  const result = await generateIgPosts(postId, sectionIndexes)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({ items: result.data }, { status: 201 })
}
