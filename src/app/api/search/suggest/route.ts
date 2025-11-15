import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ posts: [], hashtags: [] })
    }

    const supabase = createClient()

    // Get post suggestions using RPC function
    const { data: posts, error: postsError } = await supabase.rpc('search_suggestions', {
      search_query: query.trim(),
    })

    if (postsError) {
      console.error('Error fetching post suggestions:', postsError)
    }

    // Get matching hashtags
    const { data: hashtags, error: hashtagsError } = await supabase
      .from('hashtags')
      .select('id, name, slug, count')
      .ilike('name', `%${query.trim()}%`)
      .order('count', { ascending: false })
      .limit(5)

    if (hashtagsError) {
      console.error('Error fetching hashtag suggestions:', hashtagsError)
    }

    return NextResponse.json({
      posts: posts || [],
      hashtags: hashtags || [],
    })
  } catch (error) {
    console.error('Search suggest API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
