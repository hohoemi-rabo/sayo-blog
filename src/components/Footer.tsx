import Link from 'next/link'
import { SITE_CONFIG } from '@/lib/site-config'
import { getNavCategories } from '@/lib/nav-categories'
import { AI_ITEM, READ_ITEMS, SEND_ITEMS, type NavItem } from '@/lib/site-nav'
import HoisaLogo from './HoisaLogo'

const socialLinks = [
  {
    name: 'Instagram',
    href: SITE_CONFIG.instagramUrl,
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
  },
  {
    name: 'Facebook',
    href: 'https://www.facebook.com/sayo.motooka',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 3.667h-3.533v7.98H9.101z" />
      </svg>
    ),
  },
]

const ABOUT_ITEMS: NavItem[] = [
  { href: '/about', label: `${SITE_CONFIG.name}について` },
  { href: AI_ITEM.href, label: `${AI_ITEM.label}（近日公開）` },
  { href: '/privacy', label: 'プライバシーポリシー' },
]

/**
 * 公開フッター (Server)。ヘッダーと同じメニュー定義 (`site-nav.ts`) と DB のカテゴリを使う。
 * 色はヒーローに合わせた淡いローズ地。
 */
export default async function Footer() {
  const categories = await getNavCategories()
  const currentYear = new Date().getFullYear()

  return (
    <footer className="relative mt-8 overflow-hidden bg-[#FBEFEE] text-text-primary">
      {/* 上端の細い曲線 (ヒーローの装飾と揃える) */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1440 40"
        preserveAspectRatio="none"
        fill="none"
        className="absolute inset-x-0 top-0 h-6 w-full text-hoisa/30"
      >
        <path d="M0 20 C 240 0, 480 40, 720 20 S 1200 0, 1440 20" stroke="currentColor" strokeWidth="1.2" />
      </svg>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_2fr]">
          {/* Brand */}
          <div>
            <Link href="/" aria-label={`${SITE_CONFIG.name} トップへ`} className="inline-block">
              <HoisaLogo />
            </Link>
            <p className="mt-4 font-mincho tracking-[0.18em] text-text-primary/85">{SITE_CONFIG.tagline}</p>
            <p className="mt-3 max-w-sm font-noto-sans-jp text-sm leading-relaxed text-text-secondary">
              深く掘った話も、誰かが届けたい話も、小さなお知らせも。飯田下伊那の「あれこれ」が行き交う場所です。
            </p>

            <div className="mt-6 flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-hoisa shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-hoisa hover:text-white"
                  aria-label={social.name}
                >
                  {social.icon}
                </a>
              ))}
              <p className="ml-1 font-noto-sans-jp text-xs text-text-secondary">記事の更新情報やオフショットを発信中</p>
            </div>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <FooterColumn title="記事を読む" items={READ_ITEMS} />
            <FooterColumn
              title="カテゴリ"
              items={categories.map((c) => ({ href: `/${c.slug}`, label: c.name }))}
            />
            <FooterColumn title="情報を届ける" items={SEND_ITEMS} />
            <FooterColumn title={SITE_CONFIG.name} items={ABOUT_ITEMS} />
          </div>
        </div>

        <div className="mt-12 border-t border-hoisa/15 pt-6 text-center">
          <p className="font-noto-sans-jp text-xs text-text-secondary">
            &copy; {currentYear} {SITE_CONFIG.name} / {SITE_CONFIG.author.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({ title, items }: { title: string; items: NavItem[] }) {
  return (
    <nav aria-label={title}>
      <h2 className="mb-3 font-noto-sans-jp text-xs font-semibold tracking-wider text-hoisa">{title}</h2>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.href}>
            {/* globals.css が素の <a> をピンクにするので文字色を明示 */}
            <Link
              href={item.href}
              className="font-noto-sans-jp text-sm text-text-primary/85 hover:text-hoisa transition-colors"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
