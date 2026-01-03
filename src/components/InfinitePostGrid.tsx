'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
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
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Reset when filters change
  useEffect(() => {
    setPosts(initialPosts)
    setPage(1)
    setHasMore(initialHasMore)
  }, [initialPosts, initialHasMore, category, hashtags, sort])

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

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore()
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )

    const currentRef = loadMoreRef.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [hasMore, isLoading, loadMore])

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

      {/* Load more trigger / Loading indicator */}
      <div ref={loadMoreRef} className="py-8 flex justify-center">
        {isLoading && (
          <div className="flex items-center gap-2 text-text-secondary">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>読み込み中...</span>
          </div>
        )}
        {!hasMore && posts.length > 6 && (
          <p className="text-text-secondary text-sm">すべての記事を表示しました</p>
        )}
      </div>
    </div>
  )
}
