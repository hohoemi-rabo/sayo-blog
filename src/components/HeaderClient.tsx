'use client'

import { useState, useEffect, useRef, useId } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, PenLine, Sparkles, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SITE_CONFIG } from '@/lib/site-config'
import HoisaLogo from './HoisaLogo'
import SearchBar from './SearchBar'
import type { NavCategory } from '@/lib/nav-categories'
import { AI_ITEM, READ_ITEMS, SEND_ITEMS, type NavItem } from '@/lib/site-nav'


export default function HeaderClient({ categories }: { categories: NavCategory[] }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // ページ遷移したらスマホメニューを閉じる
  useEffect(() => {
    setIsMenuOpen(false)
  }, [pathname])

  return (
    <header
      className={cn(
        'sticky top-0 z-50 bg-[#FDF8F7]/95 backdrop-blur-md border-b transition-all duration-300',
        isScrolled ? 'border-hoisa/15 shadow-[0_4px_20px_rgba(224,82,127,0.08)]' : 'border-transparent'
      )}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between gap-4 h-16 md:h-20" aria-label="メインメニュー">
          {/* Logo + tagline */}
          <Link href="/" className="flex items-center gap-5 shrink-0" aria-label={`${SITE_CONFIG.name} トップへ`}>
            <HoisaLogo />
            <span className="hidden xl:inline pl-3 font-mincho text-sm tracking-[0.18em] text-text-primary/80">
              {SITE_CONFIG.tagline}
            </span>
          </Link>

          {/* Desktop navigation */}
          <div className="hidden lg:flex items-center gap-2 xl:gap-4">
            <NavDropdown label="記事を読む">
              {(close) => <ItemList items={READ_ITEMS} onNavigate={close} />}
            </NavDropdown>

            <NavDropdown label="探す" panelClassName="w-[22rem]">
              {(close) => <SearchPanel categories={categories} onNavigate={close} />}
            </NavDropdown>

            <AiLink />

            <NavDropdown
              label="情報を届ける"
              align="right"
              icon={<PenLine className="w-4 h-4" aria-hidden="true" />}
              buttonClassName="ml-2 px-5 py-2.5 rounded-full text-white font-semibold bg-gradient-to-r from-hoisa-light to-hoisa shadow-[0_6px_18px_rgba(224,82,127,0.32)] hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(224,82,127,0.4)]"
            >
              {(close) => <ItemList items={SEND_ITEMS} onNavigate={close} />}
            </NavDropdown>

            <div className="w-56 xl:w-64">
              <SearchBar compact />
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            className="lg:hidden flex flex-col items-center justify-center w-10 h-10 space-y-1.5"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-label={isMenuOpen ? 'メニューを閉じる' : 'メニューを開く'}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
          >
            <span className={cn('block w-6 h-0.5 bg-hoisa transition-all duration-300', isMenuOpen && 'rotate-45 translate-y-2')} />
            <span className={cn('block w-6 h-0.5 bg-hoisa transition-all duration-300', isMenuOpen && 'opacity-0')} />
            <span className={cn('block w-6 h-0.5 bg-hoisa transition-all duration-300', isMenuOpen && '-rotate-45 -translate-y-2')} />
          </button>
        </nav>
      </div>

      {isMenuOpen && <MobileMenu categories={categories} />}
    </header>
  )
}

/* ------------------------------------------------------------------ */

type NavDropdownProps = {
  label: string
  icon?: React.ReactNode
  align?: 'left' | 'right'
  buttonClassName?: string
  panelClassName?: string
  children: (close: () => void) => React.ReactNode
}

/**
 * ヘッダーのプルダウン。クリックで開閉 (マウスはホバーでも開く)。
 * Esc で閉じてボタンへフォーカスを戻す / 外側クリックで閉じる / ページ遷移で閉じる。
 */
function NavDropdown({ label, icon, align = 'left', buttonClassName, panelClassName, children }: NavDropdownProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  // マウスはホバーで既に開いているので、クリックで閉じてしまわないよう入力種別を覚えておく
  const lastPointerType = useRef<string | null>(null)
  const panelId = useId()
  const pathname = usePathname()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const close = () => setOpen(false)

  return (
    <div
      ref={containerRef}
      className="relative"
      onPointerEnter={(e) => e.pointerType === 'mouse' && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setOpen(false)}
      // キーボードでパネルの外へ Tab 移動したら閉じる
      onBlur={(e) => {
        if (!containerRef.current?.contains(e.relatedTarget as Node)) setOpen(false)
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        onPointerDown={(e) => {
          lastPointerType.current = e.pointerType
        }}
        onClick={() => {
          if (lastPointerType.current === 'mouse') setOpen(true)
          else setOpen((v) => !v) // タッチ・キーボード (Enter / Space) は開閉トグル
          lastPointerType.current = null
        }}
        aria-expanded={open}
        aria-controls={panelId}
        className={cn(
          'inline-flex items-center gap-1.5 whitespace-nowrap font-noto-sans-jp text-[0.95rem] transition-all duration-200',
          buttonClassName ?? 'px-3 py-2 rounded-full font-medium text-text-primary hover:text-hoisa'
        )}
      >
        {icon}
        {label}
        <ChevronDown
          className={cn('w-4 h-4 transition-transform duration-200', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {/* ホバーで開いたとき、ボタンからパネルへ移る隙間で閉じないよう pt で橋渡しする */}
      <div
        id={panelId}
        hidden={!open}
        className={cn('absolute top-full pt-2 z-50', align === 'right' ? 'right-0' : 'left-0')}
      >
        <div
          className={cn(
            'w-72 rounded-2xl border border-hoisa/15 bg-white p-2 shadow-[0_16px_40px_rgba(45,43,41,0.12)] animate-fade-in',
            panelClassName
          )}
        >
          {children(close)}
        </div>
      </div>
    </div>
  )
}

function ItemList({ items, onNavigate }: { items: NavItem[]; onNavigate: () => void }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            onClick={onNavigate}
            className="block rounded-xl px-4 py-3 hover:bg-hoisa/5 focus-visible:bg-hoisa/5 focus:outline-none transition-colors"
          >
            <span className="block font-noto-sans-jp font-medium text-text-primary">{item.label}</span>
            {item.description && (
              <span className="block mt-0.5 text-xs font-noto-sans-jp text-text-secondary">
                {item.description}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  )
}

function SearchPanel({ categories, onNavigate }: { categories: NavCategory[]; onNavigate: () => void }) {
  return (
    <div className="p-2">
      <p className="px-2 pb-2 text-xs font-noto-sans-jp font-semibold tracking-wider text-text-secondary">
        カテゴリから探す
      </p>
      <ul className="grid grid-cols-2 gap-1">
        {categories.map((category) => (
          <li key={category.slug}>
            <Link
              href={`/${category.slug}`}
              onClick={onNavigate}
              className="block rounded-xl px-3 py-2.5 font-noto-sans-jp text-sm text-text-primary hover:bg-hoisa/5 hover:text-hoisa focus-visible:bg-hoisa/5 focus:outline-none transition-colors"
            >
              {category.name}
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-2 border-t border-hoisa/10 pt-2">
        <Link
          href="/search"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-xl px-3 py-2.5 font-noto-sans-jp text-sm text-text-primary hover:bg-hoisa/5 hover:text-hoisa focus-visible:bg-hoisa/5 focus:outline-none transition-colors"
        >
          <Search className="w-4 h-4" aria-hidden="true" />
          キーワードで探す
        </Link>
      </div>
    </div>
  )
}

/** AI チャットは未公開 (管理者のみ利用可)。一般の人には /chat で「近日公開」の案内を出す */
function AiLink({ onNavigate, block }: { onNavigate?: () => void; block?: boolean }) {
  return (
    <Link
      href={AI_ITEM.href}
      onClick={onNavigate}
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap font-noto-sans-jp font-medium text-text-primary hover:text-hoisa transition-colors',
        block ? 'py-2' : 'px-3 py-2 text-[0.95rem]'
      )}
    >
      {AI_ITEM.label}
      <Sparkles className="w-4 h-4 text-hoisa" aria-hidden="true" />
      <span className="rounded-full bg-hoisa/10 px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide text-hoisa">
        近日公開
      </span>
    </Link>
  )
}

/* ------------------------------------------------------------------ */

function MobileMenu({ categories }: { categories: NavCategory[] }) {
  return (
    <div
      id="mobile-menu"
      className="lg:hidden max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-hoisa/10 bg-[#FDF8F7] animate-fade-in"
    >
      <div className="container mx-auto px-4 py-5 space-y-6">
        <SearchBar />

        <MobileSection title="記事を読む">
          <ul className="space-y-1">
            {READ_ITEMS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="block py-2 font-noto-sans-jp font-medium text-text-primary hover:text-hoisa">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </MobileSection>

        <MobileSection title="カテゴリから探す">
          <ul className="grid grid-cols-2 gap-2">
            {categories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/${category.slug}`}
                  className="block rounded-full border border-hoisa/20 px-3 py-2 text-center font-noto-sans-jp text-sm text-text-primary hover:border-hoisa hover:text-hoisa"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </MobileSection>

        <div className="space-y-1">
          <AiLink block />
          <Link href="/about" className="block py-2 font-noto-sans-jp font-medium text-text-primary hover:text-hoisa">
            {SITE_CONFIG.name}について
          </Link>
        </div>

        <MobileSection title="情報を届ける">
          <div className="grid gap-2">
            {SEND_ITEMS.map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'block rounded-2xl px-4 py-3 font-noto-sans-jp',
                  i === 0
                    ? 'text-white bg-gradient-to-r from-hoisa-light to-hoisa shadow-[0_6px_18px_rgba(224,82,127,0.28)]'
                    : 'border border-hoisa/30 text-text-primary'
                )}
              >
                <span className="block font-semibold">{item.label}</span>
                <span className={cn('block text-xs mt-0.5', i === 0 ? 'text-white/90' : 'text-text-secondary')}>
                  {item.description}
                </span>
              </Link>
            ))}
          </div>
        </MobileSection>
      </div>
    </div>
  )
}

function MobileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-noto-sans-jp font-semibold tracking-wider text-text-secondary">{title}</h2>
      {children}
    </section>
  )
}
