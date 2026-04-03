'use client'

import { useState, useCallback } from 'react'
import { Loader2, ChevronDown } from 'lucide-react'
import PostCard from './PostCard'
import { PostWithRelations } from '@/lib/types'

interface InfinitePostGridProps {
  initialPosts: PostWithRelations[]
  initialHasMore: boolean
  category?: string
  hashtags?: string
  sort?: string
}

export default function InfinitePostGrid({
  initialPosts,
  initialHasMore,
  category,
  hashtags,
  sort,
}: InfinitePostGridProps) {
  const [posts, setPosts] = useState<PostWithRelations[]>(initialPosts)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [isLoading, setIsLoading] = useState(false)

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return

    setIsLoading(true)
    const nextPage = page + 1

    try {
      const params = new URLSearchParams()
      params.set('page', nextPage.toString())
      params.set('limit', '6')
      if (category) params.set('category', category)
      if (hashtags) params.set('hashtags', hashtags)
      if (sort) params.set('sort', sort)

      const response = await fetch(`/api/posts?${params.toString()}`)
      const data = await response.json()

      if (data.posts && data.posts.length > 0) {
        setPosts((prev) => [...prev, ...data.posts])
        setPage(nextPage)
        setHasMore(data.hasMore)
      } else {
        setHasMore(false)
      }
    } catch (error) {
      console.error('Failed to load more posts:', error)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, hasMore, page, category, hashtags, sort])

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary text-lg">記事が見つかりませんでした</p>
        <p className="text-text-secondary text-sm mt-2">
          フィルターを変更してみてください
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post, index) => (
          <div
            key={post.id}
            className="animate-fade-in"
            style={{ animationDelay: `${(index % 6) * 50}ms` }}
          >
            <PostCard post={post} />
          </div>
        ))}
      </div>

      {/* Load more button */}
      <div className="py-8 flex justify-center">
        {hasMore && (
          <button
            onClick={loadMore}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-primary text-primary font-noto-sans-jp hover:bg-primary hover:text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                読み込み中...
              </>
            ) : (
              <>
                もっと見る
                <ChevronDown className="w-4 h-4" />
              </>
            )}
          </button>
        )}
        {!hasMore && posts.length > 6 && (
          <p className="text-text-secondary text-sm">すべての記事を表示しました</p>
        )}
      </div>
    </div>
  )
}
