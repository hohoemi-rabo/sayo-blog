# 04: Top Page Layout Implementation

## Overview

Implement the top page structure with Header, Hero Section, and Footer components. Focus on responsive layout and navigation.

## Related Files

- `src/app/page.tsx` - Top page
- `src/app/layout.tsx` - Root layout
- `src/components/Header.tsx` - Site header
- `src/components/HeroSection.tsx` - Hero section
- `src/components/Footer.tsx` - Site footer
- `src/components/Navigation.tsx` - Navigation menu

## Technical Details

### Layout Structure

```
Header (ロゴ・ナビ・検索バー)
  ↓
HeroSection (メインビジュアル・サイト説明)
  ↓
FilterBar (地域・カテゴリ・ハッシュタグ・ソート)
  ↓
Card Grid (記事カード一覧)
  ↓
Pagination
  ↓
PopularHashtags (人気ハッシュタグクラウド)
  ↓
Footer
```

### Responsive Breakpoints

- Mobile: 375px - 767px
- Tablet: 768px - 1023px
- Desktop: 1024px - 1920px

## Todo

### Header Component

- [×] Create Header component (`src/components/Header.tsx`)
- [×] Add site logo/title
- [×] Implement navigation menu
  - [×] Home link
  - [×] About link (if needed)
  - [×] Categories dropdown (optional)
- [×] Add search bar (placeholder for now, implement later)
- [×] Make header sticky on scroll
- [×] Add mobile hamburger menu
- [×] Implement smooth scroll behavior

### Hero Section

- [×] Create HeroSection component (`src/components/HeroSection.tsx`)
- [×] Add main visual/background image
- [×] Add site title/catchphrase
  - Title: "Sayo's Journal"
  - Subtitle: "言葉で"場所・人・記憶"をつなぐ"
- [×] Add decorative elements (Beardsley-inspired SVG patterns)
- [×] Make responsive (full height on mobile, partial on desktop)
- [×] Add scroll indicator (chevron down icon)

### Footer Component

- [×] Create Footer component (`src/components/Footer.tsx`)
- [×] Add site map links
  - [×] Home
  - [×] Categories
  - [×] About
  - [×] Privacy Policy (placeholder)
- [×] Add SNS links (if available)
  - [×] Twitter/X
  - [×] Instagram
  - [×] Facebook
- [×] Add copyright notice
- [×] Add decorative border/pattern (top edge)
- [×] Make responsive (stack on mobile)

### Layout Integration

- [×] Update `src/app/layout.tsx` with font variables
- [×] Add global Header to layout
- [×] Add global Footer to layout
- [×] Configure metadata (title, description, OG tags)
- [×] Set up viewport configuration
- [×] Add theme color meta tags

### Styling & Animations

- [×] Apply color palette from design system
- [×] Add Framer Motion animations
  - [×] Header fade-in on load
  - [×] Hero section content slide-up
  - [×] Footer fade-in on scroll into view
- [×] Add hover effects to navigation items
- [×] Implement smooth page transitions

## Component Example

```typescript
// src/components/Header.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <motion.header
      className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border-decorative"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-playfair font-bold text-primary">
            Sayo's Journal
          </Link>

          {/* Desktop Navigation */}
          <ul className="hidden md:flex space-x-8">
            <li><Link href="/">Home</Link></li>
            <li><Link href="/about">About</Link></li>
          </ul>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {/* Hamburger icon */}
          </button>
        </nav>
      </div>
    </motion.header>
  )
}
```

## References

- REQUIREMENTS.md - Section 4.1 (Top Page Structure)
- CLAUDE.md - Component Conventions
- [Framer Motion Animations](https://www.framer.com/motion/)

## Validation

- [×] Header stays sticky on scroll
- [×] Mobile menu opens/closes smoothly
- [×] All links navigate correctly
- [×] Responsive on all breakpoints (375px - 1920px)
- [×] Animations run smoothly (60fps)
- [×] Accessibility: keyboard navigation works
- [ ] Lighthouse score: Performance 90+ (to be tested with real content)
