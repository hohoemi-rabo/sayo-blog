# 15: Phase 2 Features Implementation

## Overview

Implement Phase 2 interactive enhancements including scroll progress bar, table of contents, image lightbox, related articles, reaction buttons, and advanced animations.

## Related Files

- `src/components/ScrollProgress.tsx` - Scroll progress indicator
- `src/components/TableOfContents.tsx` - Article TOC with scroll spy
- `src/components/ImageLightbox.tsx` - Full-screen image viewer
- `src/components/RelatedArticles.tsx` - Related posts section
- `src/components/ReactionBar.tsx` - Emoji reaction buttons
- `src/components/SectionAnimation.tsx` - Scroll-triggered animations

## Technical Details

### Phase 2 Features Priority

1. **High Priority**: Scroll progress, Related articles
2. **Medium Priority**: Table of contents, Image lightbox
3. **Low Priority**: Reactions, Advanced animations

### Technology Stack

- **Framer Motion**: Scroll animations, transitions
- **IntersectionObserver**: TOC active section tracking
- **Supabase Realtime**: Reaction count updates (optional)

## Todo

### Scroll Progress Bar

- [ ] Create ScrollProgress component (`src/components/ScrollProgress.tsx`)
- [ ] Use `'use client'` directive
- [ ] Implement with Framer Motion `useScroll` hook
- [ ] Track scroll progress (0-100%)
- [ ] Display as horizontal bar at top of page
- [ ] Apply gradient color (primary gradient)
- [ ] Make sticky at top of viewport
- [ ] Show only on article pages
- [ ] Animate smoothly with spring transition
- [ ] Add z-index to stay above content

### Table of Contents

- [ ] Create TableOfContents component (`src/components/TableOfContents.tsx`)
- [ ] Extract headings (h2, h3) from article content
- [ ] Generate anchor links for each heading
- [ ] Display as sticky sidebar on desktop
- [ ] Collapse to dropdown on mobile
- [ ] Track active section with IntersectionObserver
- [ ] Highlight current section
- [ ] Smooth scroll to section on click
- [ ] Add expand/collapse animation
- [ ] Style with design system colors

### Image Lightbox

- [ ] Create ImageLightbox component (`src/components/ImageLightbox.tsx`)
- [ ] Use shadcn/ui Dialog component
- [ ] Make all article images clickable
- [ ] Display full-size image in modal
- [ ] Add close button (X icon)
- [ ] Add navigation arrows (prev/next) if multiple images
- [ ] Enable keyboard navigation (Esc, Arrow keys)
- [ ] Add zoom controls (+ / -)
- [ ] Implement swipe gestures on mobile
- [ ] Add image caption display
- [ ] Apply blur backdrop effect
- [ ] Animate modal entrance/exit

### Related Articles

- [ ] Create RelatedArticles component (`src/components/RelatedArticles.tsx`)
- [ ] Fetch related posts based on:
  - [ ] Same prefecture (primary)
  - [ ] Common hashtags (secondary)
  - [ ] Same parent category (tertiary)
- [ ] Display 3-6 related posts
- [ ] Use PostCard component for display
- [ ] Add "Related Articles" heading
- [ ] Implement horizontal scroll on mobile
- [ ] Add slide-in animation on scroll
- [ ] Cache related posts (optional)
- [ ] Position at end of article

### Reaction Bar

- [ ] Create ReactionBar component (`src/components/ReactionBar.tsx`)
- [ ] Use `'use client'` directive
- [ ] Display 4 emoji reactions: 💡🩷👍🔥
- [ ] Show current count for each reaction
- [ ] Increment count on click
- [ ] Update Supabase `reactions` table
- [ ] Throttle clicks (max 1 per user per post)
- [ ] Store user reactions in localStorage
- [ ] Animate count update (scale, color change)
- [ ] Make sticky on scroll (bottom or side)
- [ ] Add hover effects
- [ ] Implement Supabase Realtime for live updates (optional)

### Section Animations

- [ ] Create SectionAnimation wrapper component
- [ ] Use Framer Motion `whileInView` prop
- [ ] Apply fade-in animations to:
  - [ ] Article sections
  - [ ] Related articles
  - [ ] Popular hashtags
  - [ ] Footer
- [ ] Configure animation variants:
  - [ ] Fade in from bottom
  - [ ] Fade in from left/right
  - [ ] Scale in
- [ ] Set `viewport: { once: true }` to animate only once
- [ ] Add stagger animation for lists
- [ ] Make animations optional (respect prefers-reduced-motion)

### Advanced UI Enhancements

- [ ] Add decorative SVG patterns (Beardsley-inspired)
- [ ] Implement wave/curve dividers between sections
- [ ] Add subtle parallax effect to hero images
- [ ] Create animated category gradient backgrounds
- [ ] Add hover effects to category badges (gradient shift)
- [ ] Implement smooth page transitions (optional)

### Performance Optimization

- [ ] Lazy load Phase 2 components
- [ ] Use dynamic imports for heavy components
- [ ] Optimize animations for 60fps
- [ ] Reduce JavaScript bundle size
- [ ] Test performance on low-end devices
- [ ] Add loading skeletons for async content

## Component Examples

### Scroll Progress Bar

```typescript
// src/components/ScrollProgress.tsx
'use client'

import { motion, useScroll, useSpring } from 'framer-motion'

export default function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  })

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent-purple origin-left z-50"
      style={{ scaleX }}
    />
  )
}
```

### Table of Contents

```typescript
// src/components/TableOfContents.tsx
'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface Heading {
  id: string
  text: string
  level: number
}

export default function TableOfContents({ headings }: { headings: Heading[] }) {
  const [activeId, setActiveId] = useState('')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      { rootMargin: '-80px 0px -80% 0px' }
    )

    headings.forEach((heading) => {
      const element = document.getElementById(heading.id)
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [headings])

  const handleClick = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <nav className="sticky top-24 max-h-[calc(100vh-6rem)] overflow-y-auto">
      <h2 className="font-bold text-lg mb-4">目次</h2>
      <ul className="space-y-2">
        {headings.map((heading) => (
          <li key={heading.id} style={{ paddingLeft: `${(heading.level - 2) * 1}rem` }}>
            <button
              onClick={() => handleClick(heading.id)}
              className={`
                text-left text-sm transition-colors
                ${activeId === heading.id
                  ? 'text-primary font-medium'
                  : 'text-text-secondary hover:text-text-primary'
                }
              `}
            >
              {heading.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
```

### Related Articles

```typescript
// src/components/RelatedArticles.tsx
import { createClient } from '@/lib/supabase'
import PostCard from './PostCard'
import { motion } from 'framer-motion'

export default async function RelatedArticles({
  postId,
  categories,
  hashtags,
}: {
  postId: string
  categories: string[]
  hashtags: string[]
}) {
  const supabase = createClient()

  // Fetch related posts
  const { data: posts } = await supabase
    .from('posts')
    .select(
      `
      *,
      post_categories(categories(name, slug)),
      post_hashtags(hashtags(name, slug))
    `
    )
    .eq('is_published', true)
    .neq('id', postId)
    .limit(6)

  // TODO: Implement better relevance scoring
  const relatedPosts = posts?.slice(0, 3) || []

  if (relatedPosts.length === 0) return null

  return (
    <section className="mt-16 pt-16 border-t border-border-decorative">
      <h2 className="text-2xl font-playfair font-bold mb-8">関連記事</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {relatedPosts.map((post, index) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            viewport={{ once: true }}
          >
            <PostCard post={post} />
          </motion.div>
        ))}
      </div>
    </section>
  )
}
```

### Reaction Bar

```typescript
// src/components/ReactionBar.tsx
'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

const reactions = [
  { type: 'light', emoji: '💡' },
  { type: 'heart', emoji: '🩷' },
  { type: 'thumbs', emoji: '👍' },
  { type: 'fire', emoji: '🔥' },
]

export default function ReactionBar({ postId }: { postId: string }) {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [userReactions, setUserReactions] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Load user reactions from localStorage
    const stored = localStorage.getItem(`reactions_${postId}`)
    if (stored) {
      setUserReactions(new Set(JSON.parse(stored)))
    }

    // Fetch current counts
    fetchCounts()
  }, [postId])

  const fetchCounts = async () => {
    const response = await fetch(`/api/reactions/${postId}`)
    const data = await response.json()
    setCounts(data)
  }

  const handleReaction = async (type: string) => {
    // Check if already reacted
    if (userReactions.has(type)) return

    // Optimistic update
    setCounts((prev) => ({ ...prev, [type]: (prev[type] || 0) + 1 }))
    setUserReactions((prev) => new Set([...prev, type]))

    // Save to localStorage
    localStorage.setItem(
      `reactions_${postId}`,
      JSON.stringify([...userReactions, type])
    )

    // Update server
    await fetch('/api/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: postId, reaction_type: type }),
    })
  }

  return (
    <div className="fixed bottom-8 right-8 bg-white rounded-full shadow-lg p-2 flex gap-2">
      {reactions.map(({ type, emoji }) => (
        <motion.button
          key={type}
          onClick={() => handleReaction(type)}
          disabled={userReactions.has(type)}
          className={`
            relative p-3 rounded-full transition-colors
            ${userReactions.has(type)
              ? 'bg-primary/20 cursor-not-allowed'
              : 'hover:bg-background-dark/5'
            }
          `}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="text-2xl">{emoji}</span>
          {counts[type] > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {counts[type]}
            </span>
          )}
        </motion.button>
      ))}
    </div>
  )
}
```

## References

- REQUIREMENTS.md - Section 5 (Phase 2 Features)
- [Framer Motion](https://www.framer.com/motion/)
- [IntersectionObserver API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)

## Validation Checklist

- [ ] Scroll progress bar displays correctly
- [ ] Table of contents tracks active section
- [ ] Image lightbox opens and displays full image
- [ ] Related articles show relevant posts
- [ ] Reaction buttons increment counts
- [ ] Animations run smoothly at 60fps
- [ ] All features work on mobile
- [ ] Keyboard navigation works
- [ ] Performance remains acceptable (Lighthouse > 85)
- [ ] No console errors
- [ ] Animations respect prefers-reduced-motion
- [ ] Features degrade gracefully if JavaScript fails
