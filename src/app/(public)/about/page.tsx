import { Metadata } from 'next'
import Image from 'next/image'
import { Mic, UtensilsCrossed, MapPin, Search, FileEdit, Camera, Send } from 'lucide-react'
import { SITE_CONFIG } from '@/lib/site-config'

export const metadata: Metadata = {
  title: `About | ${SITE_CONFIG.name}`,
  description: 'ライター・インタビュアー本岡紗代のプロフィール。地域密着の取材記事やインタビューを中心に、言葉の温度をたいせつにした執筆活動を行っています。',
  alternates: {
    canonical: `${SITE_CONFIG.url}/about`,
  },
}

const specialties = [
  {
    icon: Mic,
    title: 'インタビュー',
    description:
      '地域で活躍する人々の声を丁寧に拾い上げ、その想いを読者に届けます。人と人をつなぐ記事作りを心がけています。',
  },
  {
    icon: UtensilsCrossed,
    title: '食レポ記事',
    description:
      '味覚だけでなく、香りや食感、調理法まで丁寧に表現。読者が実際に味わっているかのような臨場感ある記事を執筆します。',
  },
  {
    icon: MapPin,
    title: '観光ガイド記事',
    description:
      '観光スポットから隠れた名所まで、旅行者の心を掴むガイド記事を執筆。実体験に基づいた生きた情報をお届けします。',
  },
  {
    icon: Search,
    title: 'SEO',
    description:
      '検索意図を捉えたキーワード選定と、読者に価値を提供する記事構成で、検索上位表示を実現。効果的なSEO対策を提供します。',
  },
  {
    icon: FileEdit,
    title: '編集・構成',
    description:
      '読みやすい文章構成と適切な見出し設定で、最後まで読まれる記事を作成。校正・推敲も含めたトータルサポートが可能です。',
  },
  {
    icon: Camera,
    title: '写真',
    description:
      '取材時の写真撮影も対応可能。記事を彩る魅力的な写真で、読者により強い印象を与えるコンテンツを提供します。',
  },
]

export default function AboutPage() {
  return (
    <>
      {/* Profile Section */}
      <section className="relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative">
          <div className="max-w-4xl mx-auto">
            {/* Page title */}
            <div className="text-center mb-12">
              <h1 className="text-3xl md:text-4xl font-playfair font-bold text-text-primary mb-3">
                About
              </h1>
              <div className="flex items-center justify-center">
                <div className="h-px w-12 bg-gradient-to-r from-transparent via-primary to-transparent" />
                <div className="mx-3 w-1.5 h-1.5 rounded-full bg-primary" />
                <div className="h-px w-12 bg-gradient-to-r from-transparent via-primary to-transparent" />
              </div>
            </div>

            {/* Profile card */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12">
              {/* Photo */}
              <div className="flex-shrink-0">
                <div className="relative w-48 h-48 md:w-56 md:h-56 rounded-full overflow-hidden border-4 border-white shadow-lg">
                  <Image
                    src="/images/profile.jpg"
                    alt="本岡紗代"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 192px, 224px"
                    priority
                  />
                </div>
              </div>

              {/* Bio */}
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl md:text-3xl font-playfair font-bold text-text-primary mb-1">
                  FUNE
                </h2>
                <p className="text-sm text-primary font-noto-sans-jp mb-6">
                  ライター・インタビュアー
                </p>

                <div className="space-y-4 font-noto-serif-jp text-text-secondary leading-relaxed">
                  <p>
                    言葉の力で、検索しても出てこなかった物語を届けたい。言葉は、ただの文字の羅列ではなく、人の心をつくる源ではないかと思ってます。
                  </p>
                  <p>
                    芸能ニュースは一瞬で調べれるのに、生まれ育った町の記憶や、なじみのお店、近所の素敵なあの人の話は、なかなか見つからない。
                    でも、半ばあきらめ気味でふと検索してみたら、案外ヒットした！そんな驚きと、ちょっとした温かさを感じてもらえたら嬉しい。それが、私の文屋としてのいちばんのやりがいです。
                  </p>
                  <p>
                    これまで、地域密着の取材記事やインタビューを中心に、観光・飲食・暮らし・IT・リフォーム関係など、多彩なジャンルの執筆を重ねてきました。
                  </p>
                  <p className="text-text-primary font-medium">
                    一つひとつの言葉の温度やノリをたいせつに、誰かの心に、そっと残る文章を綴りたい。たとえ、それがほかの誰かにとっては無駄な言葉だったとしても。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Specialties Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-playfair font-bold text-text-primary mb-3">
              What I Do
            </h2>
            <div className="flex items-center justify-center">
              <div className="h-px w-12 bg-gradient-to-r from-transparent via-primary to-transparent" />
              <div className="mx-3 w-1.5 h-1.5 rounded-full bg-primary" />
              <div className="h-px w-12 bg-gradient-to-r from-transparent via-primary to-transparent" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {specialties.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="bg-white rounded-xl border border-border-decorative/60 p-6 hover:shadow-decorative transition-shadow duration-300"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-base font-bold font-noto-sans-jp text-text-primary mb-2">
                  {title}
                </h3>
                <p className="text-sm text-text-secondary font-noto-serif-jp leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 pb-16 md:pb-24">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-accent-turquoise/5 rounded-2xl border border-primary/15 p-8 md:p-12">
            <h2 className="text-2xl md:text-3xl font-playfair font-bold text-text-primary mb-3">
              Contact
            </h2>
            <p className="text-text-secondary font-noto-serif-jp leading-relaxed mb-6">
              お仕事のご依頼・ご相談は、<br className="sm:hidden" />
              Instagram の DM からお気軽にどうぞ。
            </p>
            <a
              href="https://www.instagram.com/fune.iida.toyooka.odekake/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-white font-noto-sans-jp hover:bg-[#e8558a] hover:shadow-md transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              Instagram で連絡する
              <Send className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
