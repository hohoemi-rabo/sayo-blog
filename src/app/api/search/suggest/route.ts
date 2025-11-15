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

    // Get post suggestions with full category hierarchy
    const { data: postsData, error: postsError } = await supabase
      .from('posts')
      .select(
        `
        id,
        title,
        slug,
        thumbnail_url,
        post_categories(
          categories(id, slug, parent_id)
        )
      `
      )
      .eq('is_published', true)
      .or(`title.ilike.%${query.trim()}%,excerpt.ilike.%${query.trim()}%`)
      .order('view_count', { ascending: false })
      .limit(5)

    if (postsError) {
      console.error('Error fetching post suggestions:', postsError)
    }

    // Fetch all categories once to avoid N+1 queries
    const { data: allCategories } = await supabase.from('categories').select('id, slug, parent_id')

    // Create a map for fast lookup
    const categoryMap = new Map(allCategories?.map((cat) => [cat.id, cat]) || [])

    // Helper function to find prefecture by traversing up the hierarchy
    const findPrefecture = (categoryId: string): string => {
      const category = categoryMap.get(categoryId)
      if (!category) return ''

      // If this is a prefecture (no parent), return its slug
      if (category.parent_id === null) {
        return category.slug
      }

      // Otherwise, traverse up to parent
      return findPrefecture(category.parent_id)
    }

    // Extract prefecture for each post
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const posts = (postsData || []).map((post: any) => {
      let prefectureSlug = ''
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const categories = post.post_categories?.map((pc: any) => pc.categories) || []

      if (categories.length > 0) {
        // Try to find prefecture by traversing the first category's hierarchy
        prefectureSlug = findPrefecture(categories[0].id)
      }

      return {
        id: post.id,
        title: post.title,
        slug: post.slug,
        thumbnail_url: post.thumbnail_url,
        prefecture: prefectureSlug,
      }
    })

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
