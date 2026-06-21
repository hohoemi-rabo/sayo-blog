'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import SearchBar from './SearchBar'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { href: '/', label: 'ホーム' },
    { href: '/blog', label: 'ブログ' },
    { href: '/gallery', label: 'ギャラリー' },
    { href: '/about', label: 'About' },
    { href: '/chat', label: 'AI Chat' },
  ]

  const ctaLinks = [
    { href: '/request/mini', label: '情報を届ける', emoji: '📩', primary: false },
    { href: '/request/long', label: '取材を依頼', emoji: '✍️', primary: true },
  ]

  return (
    <header
      className={`sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b transition-all duration-300 animate-fade-in ${
        isScrolled ? 'border-border-decorative shadow-md' : 'border-transparent'
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center space-x-2 group"
          >
            <span className="text-2xl md:text-3xl font-playfair font-bold text-primary transition-colors duration-200 group-hover:text-primary-hover">
              Sayo&apos;s Journal
            </span>
          </Link>

          {/* Desktop Navigation */}
          <ul className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-text-primary font-noto-sans-jp font-medium hover:text-primary transition-colors duration-200 relative group"
                >
                  {link.label}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-200 group-hover:w-full" />
                </Link>
              </li>
            ))}
          </ul>

          {/* CTA + Search Bar (Desktop) */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2">
              {ctaLinks.map((cta) => (
                <Link
                  key={cta.href}
                  href={cta.href}
                  className={`rounded-full text-sm font-noto-sans-jp transition-all duration-200 whitespace-nowrap ${
                    cta.primary
                      ? 'px-5 py-2.5 font-semibold text-white bg-gradient-to-r from-[#ED93B1] to-[#D85A30] shadow-[0_4px_14px_rgba(216,90,48,0.35)] [text-shadow:0_1px_2px_rgba(0,0,0,0.18)] hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(216,90,48,0.45)]'
                      : 'px-4 py-2 font-medium text-primary border border-primary/40 hover:border-primary hover:bg-primary/5'
                  }`}
                >
                  <span className="mr-1">{cta.emoji}</span>
                  {cta.label}
                </Link>
              ))}
            </div>
            <SearchBar />
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden flex flex-col items-center justify-center w-10 h-10 space-y-1.5 group"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
          >
            <span
              className={`block w-6 h-0.5 bg-primary transition-all duration-300 ${
                isMenuOpen ? 'rotate-45 translate-y-2' : ''
              }`}
            />
            <span
              className={`block w-6 h-0.5 bg-primary transition-all duration-300 ${
                isMenuOpen ? 'opacity-0' : ''
              }`}
            />
            <span
              className={`block w-6 h-0.5 bg-primary transition-all duration-300 ${
                isMenuOpen ? '-rotate-45 -translate-y-2' : ''
              }`}
            />
          </button>
        </nav>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-border-decorative bg-background animate-fade-in overflow-hidden">
          <div className="container mx-auto px-4 py-4">
            <ul className="space-y-4">
              {navLinks.map((link, index) => (
                <li
                  key={link.href}
                  className="animate-slide-in-left"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <Link
                    href={link.href}
                    className="block py-2 text-text-primary font-noto-sans-jp font-medium hover:text-primary transition-colors duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}

              {/* Mobile CTA buttons */}
              <li
                className="animate-slide-in-left"
                style={{ animationDelay: `${navLinks.length * 100}ms` }}
              >
                <div className="flex flex-col gap-2 pt-2">
                  {ctaLinks.map((cta) => (
                    <Link
                      key={cta.href}
                      href={cta.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={`rounded-full text-center text-sm font-noto-sans-jp transition-all duration-200 ${
                        cta.primary
                          ? 'px-5 py-3 font-semibold text-white bg-gradient-to-r from-[#ED93B1] to-[#D85A30] shadow-[0_4px_14px_rgba(216,90,48,0.35)] [text-shadow:0_1px_2px_rgba(0,0,0,0.18)] active:brightness-95'
                          : 'px-4 py-2.5 font-medium text-text-secondary border border-primary/30 hover:text-primary hover:border-primary'
                      }`}
                    >
                      <span className="mr-1">{cta.emoji}</span>
                      {cta.label}
                    </Link>
                  ))}
                </div>
              </li>

              {/* Mobile Search */}
              <li
                className="animate-slide-in-left"
                style={{ animationDelay: `${(navLinks.length + 1) * 100}ms` }}
              >
                <div className="pt-2">
                  <SearchBar />
                </div>
              </li>
            </ul>
          </div>
        </div>
      )}
    </header>
  )
}
