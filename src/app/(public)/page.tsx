import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import HeroSection from '@/components/HeroSection'
import PostCard from '@/components/PostCard'
import { createClient } from '@/lib/supabase'
import { SITE_CONFIG } from '@/lib/site-config'
import { PostWithRelations } from '@/lib/types'

export const metadata: Metadata = {
  title: SITE_CONFIG.title,
  description: SITE_CONFIG.description,
  alternates: {
    canonical: SITE_CONFIG.url,
  },
}

export const dynamic = 'force-dynamic'

async function getPickupPosts(): Promise<PostWithRelations[]> {
  const supabase = createClient()

  // TODO: 管理画面でお気に入り記事を設定できるようにする。現在は最新6件を表示。
  const { data, error } = await supabase
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
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(6)

  if (error) {
    console.error('Error fetching pickup posts:', error)
    return []
  }

  return (data || []) as PostWithRelations[]
}

export default async function HomePage() {
  const posts = await getPickupPosts()

  return (
    <>
      <HeroSection />

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
