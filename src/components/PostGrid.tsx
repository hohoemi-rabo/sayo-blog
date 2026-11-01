import PostCard from './PostCard'
import { PostWithRelations } from '@/lib/types'
import type { SnippetSegment } from '@/lib/search-text'

interface PostGridProps {
  posts: PostWithRelations[]
  /** 記事 id → 検索語が見つかった箇所 (検索結果ページ用) */
  snippets?: Map<string, SnippetSegment[] | null>
}

/**
 * 検索結果の記事グリッド (Server Component)。
 * 件数と 0 件時の案内は検索ページ側で出す (全体の件数はページ送り前の総数なので、ここでは分からない)。
 */
export default function PostGrid({ posts, snippets }: PostGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {posts.map((post, index) => (
        <div
          key={post.id}
          className="animate-fade-in-up"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <PostCard post={post} snippet={snippets?.get(post.id)} />
        </div>
      ))}
    </div>
  )
}
