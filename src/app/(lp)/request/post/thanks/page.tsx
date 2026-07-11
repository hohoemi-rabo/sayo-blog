import { Metadata } from 'next'
import Link from 'next/link'
import { SITE_CONFIG } from '@/lib/site-config'

export const metadata: Metadata = {
  title: `ご相談を受け付けました | ${SITE_CONFIG.name}`,
  description: '投稿記事のご相談を受け付けました。3 日以内にご連絡いたします。',
  robots: { index: false, follow: false },
  alternates: {
    canonical: `${SITE_CONFIG.url}/request/post/thanks`,
  },
}

export default function MiniRequestThanksPage() {
  return (
    <section className="section">
      <div className="wrap">
        <div className="cta-box" style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ fontSize: 56, lineHeight: 1 }}>🌸</div>
          <h2 style={{ marginTop: 16 }}>ご相談を受け付けました</h2>
          <p>
            3 日以内に、ご記入いただいた電話番号またはメールアドレスへご連絡いたします。もしお急ぎのご相談でしたら、お電話でも承ります。掲載は無料です。
          </p>
          <div className="hero-buttons" style={{ marginTop: 8 }}>
            <Link className="btn main" href="/">
              トップへ戻る
            </Link>
            <Link className="btn gold" href="/blog">
              記事を読んでみる
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
