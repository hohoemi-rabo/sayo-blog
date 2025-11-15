import PostCard from './PostCard'
import { PostWithRelations } from '@/lib/types'
import { FileText } from 'lucide-react'

interface PostGridProps {
  posts: PostWithRelations[]
}

export default function PostGrid({ posts }: PostGridProps) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-16">
        <FileText className="w-16 h-16 mx-auto text-text-secondary opacity-30 mb-4" />
        <p className="text-lg text-text-secondary font-noto-sans-jp">
          条件に一致する記事が見つかりませんでした
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Result count */}
      <p className="text-text-secondary font-noto-sans-jp mb-6 animate-fade-in">
        {posts.length}件の記事が見つかりました
      </p>

      {/* Grid with CSS stagger animation */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post, index) => (
          <div
            key={post.id}
            className="animate-fade-in-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <PostCard post={post} />
          </div>
        ))}
      </div>
    </div>
  )
}
