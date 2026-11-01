import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { articlePath } from '@/lib/seo-utils'
import { escapeLikePattern, splitSearchTerms } from '@/lib/search-text'

const SUGGEST_LIMIT = 5

/**
 * 検索欄の入力候補。記事は検索ページと同じ search_published_posts (上位 5 件)、
 * タグは名前に最初の語を含むもの (よく使われている順)。
 */
export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get('q') ?? ''
    const terms = splitSearchTerms(query)

    if (query.trim().length < 2 || terms.length === 0) {
      return NextResponse.json({ posts: [], hashtags: [] })
    }

    const supabase = createClient()

    const [hitsResult, hashtagsResult] = await Promise.all([
      supabase.rpc('search_published_posts', {
        search_terms: terms,
        result_limit: SUGGEST_LIMIT,
        result_offset: 0,
      }),
      supabase
        .from('hashtags')
        .select('id, name, slug, count')
        .ilike('name', `%${escapeLikePattern(terms[0])}%`)
        .gt('count', 0)
        .order('count', { ascending: false })
        .limit(SUGGEST_LIMIT),
    ])

    if (hitsResult.error) console.error('Error fetching post suggestions:', hitsResult.error)
    if (hashtagsResult.error) console.error('Error fetching hashtag suggestions:', hashtagsResult.error)

    const postIds = ((hitsResult.data ?? []) as Array<{ id: string }>).map((r) => r.id)
    let posts: Array<{ id: string; title: string; thumbnail_url: string | null; href: string }> = []

    if (postIds.length > 0) {
      const { data, error } = await supabase
        .from('posts')
        .select('id, title, slug, thumbnail_url, post_categories(categories(slug))')
        .in('id', postIds)
        .eq('is_published', true)

      if (error) {
        console.error('Error fetching suggested posts:', error)
      } else {
        type Row = {
          id: string
          title: string
          slug: string
          thumbnail_url: string | null
          post_categories: Array<{ categories: { slug: string } | null }> | null
        }
        const byId = new Map(((data ?? []) as unknown as Row[]).map((p) => [p.id, p]))
        posts = postIds
          .map((id) => byId.get(id))
          .filter((p): p is Row => Boolean(p))
          .map((p) => ({
            id: p.id,
            title: p.title,
            thumbnail_url: p.thumbnail_url,
            href: articlePath(p.post_categories?.[0]?.categories?.slug, p.slug),
          }))
      }
    }

    return NextResponse.json({ posts, hashtags: hashtagsResult.data ?? [] })
  } catch (error) {
    console.error('Search suggest API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
