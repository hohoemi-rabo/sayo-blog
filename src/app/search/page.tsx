import { Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import { PostWithRelations } from '@/lib/types'
import PostGrid from '@/components/PostGrid'
import Pagination from '@/components/Pagination'
import SearchBar from '@/components/SearchBar'
import { Search, AlertCircle } from 'lucide-react'

interface SearchPageProps {
  searchParams: Promise<{
    q?: string
    page?: string
  }>
}

export const dynamic = 'force-dynamic'

async function searchPosts(query: string, page: number = 1, limit: number = 12) {
  if (!query || query.trim().length === 0) {
    return { posts: [], count: 0 }
  }

  const supabase = createClient()
  const offset = (page - 1) * limit

  // Use RPC function with pagination at database level
  // Note: For accurate count, we get a large result set first
  const { data: allResults, error: countError } = await supabase.rpc('search_posts', {
    search_query: query.trim(),
    result_limit: 500, // Get up to 500 for count
    result_offset: 0,
  })

  if (countError) {
    console.error('Error counting search results:', countError)
    return { posts: [], count: 0 }
  }

  const totalCount = allResults?.length || 0

  if (totalCount === 0) {
    return { posts: [], count: 0 }
  }

  // Get paginated results
  const paginatedResults = allResults?.slice(offset, offset + limit) || []

  if (paginatedResults.length === 0) {
    return { posts: [], count: totalCount }
  }

  // Fetch full post data with relations
  const postIds = paginatedResults.map((r: { id: string }) => r.id)

  const { data: posts, error: postsError } = await supabase
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
    `
    )
    .in('id', postIds)
    .eq('is_published', true)

  if (postsError) {
    console.error('Error fetching post details:', postsError)
    return { posts: [], count: totalCount }
  }

  // Create a map for O(1) lookup instead of O(n) find
  const postsMap = new Map(posts?.map((p) => [p.id, p]) || [])

  // Sort posts to match search result order (O(n) instead of O(n*m))
  const sortedPosts = postIds
    .map((id: string) => postsMap.get(id))
    .filter(Boolean) as PostWithRelations[]

  return { posts: sortedPosts, count: totalCount }
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams
  const query = params.q || ''
  const pageParam = params.page || '1'
  const currentPage = parseInt(pageParam, 10) || 1

  const { posts, count } = await searchPosts(query, currentPage)
  const totalPages = Math.ceil(count / 12)

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-playfair font-bold text-text-primary mb-6 flex items-center gap-3">
            <Search className="w-8 h-8" />
            検索
          </h1>

          {/* Search Bar */}
          <SearchBar />
        </div>

        {/* Search Results */}
        {query ? (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-noto-sans-jp text-text-primary">
                「<span className="font-semibold text-primary">{query}</span>」の検索結果
                <span className="ml-2 text-text-secondary">({count}件)</span>
              </h2>
            </div>

            {posts.length > 0 ? (
              <>
                <Suspense
                  key={`search-${query}-page-${currentPage}`}
                  fallback={<div className="text-center py-8">読み込み中...</div>}
                >
                  <PostGrid posts={posts} />
                </Suspense>

                {totalPages > 1 && (
                  <div className="mt-12">
                    <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={count} />
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16 px-4">
                <AlertCircle className="w-16 h-16 text-text-secondary/40 mx-auto mb-4" />
                <h3 className="text-xl font-noto-serif-jp text-text-primary mb-2">
                  検索結果が見つかりませんでした
                </h3>
                <p className="text-text-secondary mb-6">
                  別のキーワードで検索してみてください
                </p>
                <div className="max-w-md mx-auto">
                  <p className="text-sm text-text-secondary mb-2">検索のヒント:</p>
                  <ul className="text-sm text-text-secondary text-left space-y-1">
                    <li>• キーワードを変更してみる</li>
                    <li>• より一般的な言葉で検索する</li>
                    <li>• ハッシュタグやカテゴリーから探す</li>
                  </ul>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 px-4">
            <Search className="w-16 h-16 text-text-secondary/40 mx-auto mb-4" />
            <h3 className="text-xl font-noto-serif-jp text-text-primary mb-2">
              キーワードを入力して検索
            </h3>
            <p className="text-text-secondary">
              記事のタイトルや内容から検索できます
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
