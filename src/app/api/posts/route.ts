import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const category = searchParams.get('category') || undefined
  const hashtagsParam = searchParams.get('hashtags') || undefined
  const hashtags = hashtagsParam ? hashtagsParam.split(',').filter(Boolean) : undefined
  const sort = searchParams.get('sort') || 'latest'
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '6', 10)

  const supabase = createClient()
  const offset = (page - 1) * limit

  let query = supabase
    .from('posts')
    .select(
      `
      *,
      post_categories!inner(
        categories!inner(id, slug, name, parent_id)
      ),
      post_hashtags(
        hashtags(id, name, slug, count)
      )
    `,
      { count: 'exact' }
    )
    .eq('is_published', true)

  // Apply category filter
  if (category) {
    query = query.eq('post_categories.categories.slug', category)
  }

  // Apply sort
  switch (sort) {
    case 'popular':
      query = query.order('view_count', { ascending: false })
      break
    case 'title':
      query = query.order('title', { ascending: true })
      break
    default:
      query = query.order('published_at', { ascending: false })
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('Error fetching posts:', error)
    return NextResponse.json({ posts: [], count: 0, hasMore: false })
  }

  let posts = data || []
  let totalCount = count || 0

  // Handle hashtag filtering
  if (hashtags && hashtags.length > 0) {
    const { data: postHashtagData } = await supabase
      .from('post_hashtags')
      .select('post_id, hashtags!inner(slug)')
      .in('hashtags.slug', hashtags)

    if (!postHashtagData || postHashtagData.length === 0) {
      return NextResponse.json({ posts: [], count: 0, hasMore: false })
    }

    const matchingPostIds = [...new Set(postHashtagData.map((ph) => ph.post_id))]

    const hashtagPostsQuery = supabase
      .from('posts')
      .select(
        `
        *,
        post_categories!inner(
          categories!inner(id, slug, name, parent_id)
        ),
        post_hashtags(
          hashtags(id, name, slug, count)
        )
      `,
        { count: 'exact' }
      )
      .in('id', matchingPostIds)
      .eq('is_published', true)

    if (category) {
      hashtagPostsQuery.eq('post_categories.categories.slug', category)
    }

    switch (sort) {
      case 'popular':
        hashtagPostsQuery.order('view_count', { ascending: false })
        break
      case 'title':
        hashtagPostsQuery.order('title', { ascending: true })
        break
      default:
        hashtagPostsQuery.order('published_at', { ascending: false })
    }

    hashtagPostsQuery.range(offset, offset + limit - 1)

    const { data: hashtagPosts, count: hashtagCount } = await hashtagPostsQuery

    posts = hashtagPosts || []
    totalCount = hashtagCount || 0
  }

  const hasMore = offset + posts.length < totalCount

  return NextResponse.json({
    posts,
    count: totalCount,
    hasMore,
    page,
  })
}
