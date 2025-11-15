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

  // Use RPC function for full-text search
  const { data: searchResults, error } = await supabase.rpc('search_posts', {
    search_query: query.trim(),
    result_limit: 100, // Get more results for pagination
  })

  if (error) {
    console.error('Error searching posts:', error)
    return { posts: [], count: 0 }
  }

  // Get total count
  const count = searchResults?.length || 0

  // Paginate results
  const paginatedResults = searchResults?.slice(offset, offset + limit) || []

  // Fetch full post data with relations
  if (paginatedResults.length === 0) {
    return { posts: [], count }
  }

  const postIds = paginatedResults.map((r) => r.id)

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
    return { posts: [], count }
  }

  // Sort posts to match search result order
  const sortedPosts = postIds
    .map((id) => posts?.find((p) => p.id === id))
    .filter(Boolean) as PostWithRelations[]

  return { posts: sortedPosts, count }
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
