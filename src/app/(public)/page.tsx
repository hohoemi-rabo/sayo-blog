import { Metadata } from 'next'
import Link from 'next/link'
import { MessageCircle, BookOpen } from 'lucide-react'
import { SITE_CONFIG } from '@/lib/site-config'

export const metadata: Metadata = {
  title: SITE_CONFIG.title,
  description: SITE_CONFIG.description,
  alternates: {
    canonical: SITE_CONFIG.url,
  },
}

export const dynamic = 'force-dynamic'

export default function HomePage() {
  return (
    <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageCircle className="w-10 h-10 text-primary" />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-4">
          <h1 className="text-3xl md:text-4xl font-playfair font-bold text-text-primary">
            AI Chat
          </h1>
          <p className="text-lg text-text-secondary font-noto-sans-jp leading-relaxed">
            南信州の情報を AI がご案内します。
            <br />
            現在準備中です。もうしばらくお待ちください。
          </p>
        </div>

        {/* Blog link */}
        <div className="pt-4">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-white font-noto-sans-jp font-medium hover:bg-primary-hover transition-colors duration-200"
          >
            <BookOpen className="w-5 h-5" />
            ブログ記事を見る
          </Link>
        </div>
      </div>
    </section>
  )
}
