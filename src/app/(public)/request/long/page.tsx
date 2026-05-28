import { Metadata } from 'next'
import { SITE_CONFIG } from '@/lib/site-config'
import { LongRequestForm } from './_components/LongRequestForm'

export const metadata: Metadata = {
  title: `取材のご依頼 | ${SITE_CONFIG.name}`,
  description:
    '紗代が現地に伺って書く取材記事のご依頼窓口。お店・団体・活動の魅力を、じっくり丁寧にお届けします。取材日程と料金（500 円〜）は内容に応じて個別にご相談します。',
  alternates: {
    canonical: `${SITE_CONFIG.url}/request/long`,
  },
}

export default function LongRequestPage() {
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/8 via-accent-turquoise/5 to-accent-purple/8" />
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

      <div className="container relative mx-auto px-4 py-12 sm:px-6 md:py-16 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <header className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-white/70 px-4 py-1.5 text-sm font-noto-sans-jp font-medium text-primary backdrop-blur-sm">
              ✍️ 取材依頼の窓口
            </span>
            <h1 className="mt-6 font-playfair text-3xl font-bold leading-tight text-text-primary md:text-4xl">
              紗代が現地に伺って、じっくり書きます
            </h1>
            <div className="mx-auto mt-5 max-w-xl space-y-4 font-noto-serif-jp leading-relaxed text-text-secondary">
              <p>
                「うちの活動を、紗代さんに直接取材して書いてほしい」。
                そんなご要望にお応えする取材依頼の窓口です。
                いただいた内容をもとに、紗代から個別にご連絡し、
                取材日程・公開時期・料金（500 円〜）を一緒に決めさせていただきます。
              </p>
            </div>
            <ul className="mx-auto mt-6 flex max-w-md flex-col gap-2 text-left">
              {[
                '取材記事は有料です（500 円〜・内容に応じてご相談）',
                'ご連絡には 3 日以内にお返事します',
                'お電話でのご相談も歓迎します',
              ].map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-2 font-noto-serif-jp text-sm text-text-primary"
                >
                  <span className="mt-0.5 text-primary">✓</span>
                  {point}
                </li>
              ))}
            </ul>
          </header>

          <div className="mt-10 rounded-2xl border border-border-decorative bg-white/80 p-6 shadow-decorative backdrop-blur-sm sm:p-8">
            <LongRequestForm />
          </div>

          <p className="mt-8 text-center text-sm text-text-secondary">
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
    </div>
  )
}
