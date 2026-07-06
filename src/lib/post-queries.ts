import { createClient } from '@/lib/supabase'
import { PostWithRelations } from '@/lib/types'

// 一覧系 (blog / category / /api/posts) で共通の posts SELECT
const POST_LIST_SELECT = `
  *,
  post_categories!inner(
    categories!inner(id, slug, name, parent_id)
  ),
  post_hashtags(
    hashtags(id, name, slug, count)
  )
`

export interface PostListFilters {
  category?: string
  hashtags?: string[]
  sort?: string
  offset?: number
  limit?: number
}

export interface PostListResult {
  posts: PostWithRelations[]
  count: number
  hasMore: boolean
}

const EMPTY_RESULT: PostListResult = { posts: [], count: 0, hasMore: false }

/**
 * 公開記事の一覧を 1 本のクエリで取得する。
 * ハッシュタグ絞り込みがある場合のみ、対象 post_id の解決クエリを先に 1 回だけ実行する
 * (絞り込み無しの結果を取得してから捨てる、という無駄な往復をしない)。
 */
export async function fetchPublishedPosts({
  category,
  hashtags,
  sort = 'latest',
  offset = 0,
  limit = 6,
}: PostListFilters): Promise<PostListResult> {
  const supabase = createClient()

  // ハッシュタグ絞り込み: 該当 post_id を先に解決
  let matchingPostIds: string[] | null = null
  if (hashtags && hashtags.length > 0) {
    const { data: postHashtagData, error } = await supabase
      .from('post_hashtags')
      .select('post_id, hashtags!inner(slug)')
      .in('hashtags.slug', hashtags)

    if (error) {
      console.error('Error fetching hashtag post ids:', error)
      return EMPTY_RESULT
    }
    if (!postHashtagData || postHashtagData.length === 0) {
      return EMPTY_RESULT
    }

    matchingPostIds = [...new Set(postHashtagData.map((ph) => ph.post_id))]
  }

  let query = supabase
    .from('posts')
    .select(POST_LIST_SELECT, { count: 'exact' })
    .eq('is_published', true)

  if (matchingPostIds) {
    query = query.in('id', matchingPostIds)
  }

  if (category) {
    query = query.eq('post_categories.categories.slug', category)
  }

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

  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('Error fetching posts:', error)
    return EMPTY_RESULT
  }

  const posts = (data ?? []) as PostWithRelations[]
  const totalCount = count ?? 0

  return {
    posts,
    count: totalCount,
    hasMore: offset + posts.length < totalCount,
  }
}
