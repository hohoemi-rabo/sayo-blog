'use client'

import { motion } from 'framer-motion'
import PostCard from './PostCard'
import { PostWithRelations } from '@/lib/types'
import { staggerContainer, staggerItem } from '@/lib/motion-variants'

interface PostGridProps {
  posts: PostWithRelations[]
}

export default function PostGrid({ posts }: PostGridProps) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-16">
        <svg
          className="w-16 h-16 mx-auto text-text-secondary opacity-30 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="text-lg text-text-secondary font-noto-sans-jp">
          条件に一致する記事が見つかりませんでした
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Result count */}
      <motion.p
        className="text-text-secondary font-noto-sans-jp mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {posts.length}件の記事が見つかりました
      </motion.p>

      {/* Grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {posts.map((post) => (
          <motion.div key={post.id} variants={staggerItem}>
            <PostCard post={post} />
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
