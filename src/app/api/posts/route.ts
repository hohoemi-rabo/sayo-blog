import { NextRequest, NextResponse } from 'next/server'
import { fetchPublishedPosts } from '@/lib/post-queries'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const category = searchParams.get('category') || undefined
  const hashtagsParam = searchParams.get('hashtags') || undefined
  const hashtags = hashtagsParam ? hashtagsParam.split(',').filter(Boolean) : undefined
  const sort = searchParams.get('sort') || 'latest'
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '6', 10)
  const offset = (page - 1) * limit

  const { posts, count, hasMore } = await fetchPublishedPosts({
    category,
    hashtags,
    sort,
    offset,
    limit,
  })

  return NextResponse.json({
    posts,
    count,
    hasMore,
    page,
  })
}
