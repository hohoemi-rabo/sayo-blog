import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import HeroSection from '@/components/HeroSection'
import PostCard from '@/components/PostCard'
import HomeHighlights from '@/components/HomeHighlights'
import { getHomePosts } from '@/lib/home-posts'
import { SITE_CONFIG } from '@/lib/site-config'

export const metadata: Metadata = {
  title: { absolute: SITE_CONFIG.title },
  description: SITE_CONFIG.description,
  alternates: {
    canonical: SITE_CONFIG.url,
  },
}

export const revalidate = 600 // 10 minutes ISR

export default async function HomePage() {
  const { feature, report, randomPosts, pickup: posts } = await getHomePosts()

  return (
    <>
      <HeroSection />
      <HomeHighlights feature={feature} report={report} randomPosts={randomPosts} />

      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {/* Section heading */}
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-playfair font-bold text-text-primary mb-3">
            Pick Up
          </h2>
          <div className="flex items-center justify-center">
            <div className="h-px w-12 bg-gradient-to-r from-transparent via-primary to-transparent" />
            <div className="mx-3 w-1.5 h-1.5 rounded-full bg-primary" />
            <div className="h-px w-12 bg-gradient-to-r from-transparent via-primary to-transparent" />
          </div>
        </div>

        {/* Post grid */}
        {posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <p className="text-center text-text-secondary font-noto-sans-jp">
            記事がまだありません
          </p>
        )}

        {/* More link */}
        <div className="text-center mt-10">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-primary text-primary font-noto-sans-jp hover:bg-primary hover:text-white transition-colors duration-200"
          >
            ブログをもっと見る
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </>
  )
}
