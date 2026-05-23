import Link from 'next/link'

interface ComingSoonProps {
  badge: string
  emoji: string
  title: string
  lead: string
  points: string[]
}

/**
 * 情報窓口フォームの「準備中」ページ (Phase 4 暫定)。
 * Ticket 41 (ミニ) / 42 (ロング) で各 page.tsx を本フォームに差し替える。
 */
export function ComingSoon({ badge, emoji, title, lead, points }: ComingSoonProps) {
  return (
    <section className="relative flex min-h-[75vh] items-center overflow-hidden">
      {/* 装飾グラデーション背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-accent-turquoise/5 to-accent-purple/8" />
      <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-accent-turquoise/10 blur-3xl" />

      <div className="container relative mx-auto px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          {/* 準備中バッジ */}
          <span className="inline-flex animate-fade-in items-center gap-1.5 rounded-full border border-primary/30 bg-white/70 px-4 py-1.5 text-sm font-noto-sans-jp font-medium text-primary backdrop-blur-sm">
            🌱 準備中 · {badge}
          </span>

          {/* 大きな絵文字 */}
          <div className="mt-8 animate-slide-in-up text-6xl md:text-7xl">{emoji}</div>

          {/* タイトル */}
          <h1 className="mt-6 animate-slide-in-up stagger-2 font-playfair text-3xl font-bold leading-tight text-text-primary md:text-4xl">
            {title}
          </h1>

          {/* リード文 */}
          <p className="mx-auto mt-5 max-w-xl animate-slide-in-up stagger-3 font-noto-serif-jp leading-relaxed text-text-secondary">
            {lead}
          </p>

          {/* ティーザー (こんなことができます) */}
          <ul className="mx-auto mt-8 flex max-w-md animate-slide-in-up stagger-4 flex-col gap-3 text-left">
            {points.map((point) => (
              <li
                key={point}
                className="flex items-start gap-3 rounded-xl border border-border-decorative/60 bg-white/70 px-4 py-3 backdrop-blur-sm"
              >
                <span className="mt-0.5 text-primary">✓</span>
                <span className="font-noto-serif-jp text-sm text-text-primary">
                  {point}
                </span>
              </li>
            ))}
          </ul>

          {/* メッセージ */}
          <p className="mt-8 animate-slide-in-up stagger-5 font-noto-serif-jp text-text-primary">
            公開まで、もう少しだけお待ちください。
            <br className="sm:hidden" />
            どうぞ楽しみにしていてくださいね 🌿
          </p>

          {/* CTA */}
          <div className="mt-10 flex animate-slide-in-up stagger-6 flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/blog"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-noto-sans-jp font-medium text-white transition-all duration-200 hover:bg-primary-hover hover:shadow-md"
            >
              記事を読んでみる
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-primary px-6 py-3 font-noto-sans-jp font-medium text-primary transition-all duration-200 hover:bg-primary/10"
            >
              Sayo&apos;s Journal について
            </Link>
          </div>

          {/* 急ぎの導線 */}
          <p className="mt-8 text-sm text-text-secondary">
            お急ぎのご相談は{' '}
            <a
              href="https://www.instagram.com/fune.iida.toyooka.odekake/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Instagram の DM
            </a>{' '}
            からもどうぞ。
          </p>
        </div>
      </div>
    </section>
  )
}
