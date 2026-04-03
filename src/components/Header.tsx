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
    { href: '/about', label: 'About' },
    { href: '/chat', label: 'AI Chat' },
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

          {/* Search Bar (Desktop) */}
          <div className="hidden md:flex items-center max-w-md">
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

              {/* Mobile Search */}
              <li
                className="animate-slide-in-left"
                style={{ animationDelay: `${navLinks.length * 100}ms` }}
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
