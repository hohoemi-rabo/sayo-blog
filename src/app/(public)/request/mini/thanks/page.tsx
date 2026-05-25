import { Metadata } from 'next'
import Link from 'next/link'
import { SITE_CONFIG } from '@/lib/site-config'

export const metadata: Metadata = {
  title: `ご相談を受け付けました | ${SITE_CONFIG.name}`,
  description: 'ミニ記事のご相談を受け付けました。3 日以内にご連絡いたします。',
  robots: { index: false, follow: false },
  alternates: {
    canonical: `${SITE_CONFIG.url}/request/mini/thanks`,
  },
}

export default function MiniRequestThanksPage() {
  return (
    <section className="relative flex min-h-[70vh] items-center overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/8 via-accent-turquoise/5 to-accent-purple/8" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-accent-turquoise/10 blur-3xl" />

      <div className="container relative mx-auto px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="mx-auto max-w-xl text-center">
          <div className="text-6xl">🌿</div>
          <h1 className="mt-6 font-playfair text-3xl font-bold leading-tight text-text-primary md:text-4xl">
            ご相談を受け付けました
          </h1>
          <div className="mx-auto mt-5 max-w-md space-y-4 font-noto-serif-jp leading-relaxed text-text-secondary">
            <p>
              3 日以内に、ご記入いただいた電話番号またはメールアドレスへ
              紗代からご連絡いたします。
            </p>
            <p>もしお急ぎのご相談でしたら、お電話でも承ります。</p>
          </div>

          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-noto-sans-jp font-medium text-white transition-all duration-200 hover:bg-primary-hover hover:shadow-md"
            >
              トップへ戻る
            </Link>
            <Link
              href="/blog"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-primary px-6 py-3 font-noto-sans-jp font-medium text-primary transition-all duration-200 hover:bg-primary/10"
            >
              記事を読んでみる
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
