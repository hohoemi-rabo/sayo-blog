'use client'

import { Post } from '@/lib/types'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/lib/motion-variants'

interface PostListProps {
  posts: Post[]
}

export default function PostList({ posts }: PostListProps) {

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="py-8"
    >
      {posts.length > 0 ? (
        <>
          <motion.p
            variants={staggerItem}
            className="text-text-secondary font-noto-sans-jp mb-6"
          >
            {posts.length}件の記事が見つかりました
          </motion.p>
          <div className="space-y-4">
            {posts.map((post) => (
              <motion.div
                key={post.id}
                variants={staggerItem}
                className="p-6 bg-background border border-border-decorative rounded-xl hover:shadow-lg transition-shadow duration-200"
              >
                <h3 className="text-xl font-playfair font-bold text-primary mb-2">
                  {post.title}
                </h3>
                {post.excerpt && (
                  <p className="text-text-secondary font-noto-serif-jp line-clamp-2">
                    {post.excerpt}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        </>
      ) : (
        <motion.div variants={staggerItem} className="text-center py-16">
          <p className="text-lg text-text-secondary font-noto-sans-jp">
            条件に一致する記事が見つかりませんでした
          </p>
        </motion.div>
      )}

      {/* Placeholder for Card Grid and Pagination (will be implemented in next tickets) */}
      <motion.div
        variants={staggerItem}
        className="text-center text-text-secondary font-noto-sans-jp text-sm mt-8"
      >
        <p>(Card Grid とPaginationは次のチケットで実装されます)</p>
      </motion.div>
    </motion.div>
  )
}
