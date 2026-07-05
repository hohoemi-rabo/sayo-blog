import { Metadata } from 'next'
import { SITE_CONFIG } from '@/lib/site-config'
import { MiniRequestForm } from './_components/MiniRequestForm'

export const metadata: Metadata = {
  title: `ミニ記事のご相談 | ${SITE_CONFIG.name}`,
  description:
    'SNS で発信されている情報をもとに、短い紹介記事「ミニ記事」を書く情報提供窓口。URL を 1〜5 件お寄せください。掲載は無料です。',
  alternates: {
    canonical: `${SITE_CONFIG.url}/request/mini`,
  },
}

export default function MiniRequestPage() {
  return (
    <div className="relative overflow-hidden">
      {/* 装飾グラデーション背景 */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/8 via-accent-turquoise/5 to-accent-purple/8" />
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

      <div className="container relative mx-auto px-4 py-12 sm:px-6 md:py-16 lg:px-8">
        <div className="mx-auto max-w-2xl">
          {/* ランディング */}
          <header className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-white/70 px-4 py-1.5 text-sm font-noto-sans-jp font-medium text-primary backdrop-blur-sm">
              📩 ミニ記事の窓口
            </span>
            <h1 className="mt-6 font-playfair text-3xl font-bold leading-tight text-text-primary md:text-4xl">
              「これ、知ってほしい」を届ける
            </h1>
            <div className="mx-auto mt-5 max-w-xl space-y-4 font-noto-serif-jp leading-relaxed text-text-secondary">
              <p>
                飯田下伊那の小さな出来事も、誰かに届くまで「無かったこと」になりがちです。
                SNS で発信されている情報があれば、URL を 1〜5 件ご共有ください。
                記事に書き留めて、Sayo&apos;s Journal で紹介します。
              </p>
            </div>
            <ul className="mx-auto mt-6 flex max-w-md flex-col gap-2 text-left">
              {[
                '最大 5 つの URL から、1 つのミニ記事を作成します',
                'ご連絡には 3 日以内にお返事します（お電話または記載のメールへ）',
                'ミニ記事の掲載は無料です',
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

          {/* フォーム */}
          <div className="mt-10 rounded-2xl border border-border-decorative bg-white/80 p-6 shadow-decorative backdrop-blur-sm sm:p-8">
            <MiniRequestForm />
          </div>

          {/* 急ぎの導線 */}
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
