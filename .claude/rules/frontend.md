---
paths:
  - "src/components/**"
  - "src/app/(public)/**"
  - "src/app/(chat)/**"
  - "src/app/globals.css"
  - "tailwind.config.ts"
---

# Frontend: Design System & Public Components

## Design Philosophy

**"Poetic Psychedelic × Decorative Narrative"**
- Vivid yet elegant (psychedelic vibrancy + Beardsley refinement)
- Avoid generic blog aesthetics. Every interaction should feel intentional and artistic.

## Color Palette

- **Primary**: `#FF6B9D` (vivid rose)
- **Background**: `#FAF8F5` (soft off-white)
- **Text**: `#1A1816` (rich black)
- **Accents**: `#4ECDC4` (turquoise), `#9B59B6` (purple)

**Category Gradients** (each category has unique gradient):
- gourmet: `#FFB75E → #FFD194`
- spot: `#4FC3F7 → #81D4FA`
- event: `#5C6BC0 → #7986CB`
- culture: `#8D6E63 → #A1887F`
- news: `#AB47BC → #BA68C8`

## Typography

- **Headings**: Playfair Display (`--font-playfair`)
- **Body (Japanese)**: Noto Serif JP (`--font-noto-serif-jp`)
- **UI/Navigation**: Noto Sans JP (`--font-noto-sans-jp`)

## Component Conventions

- Use `@/` path alias for imports
- Use `PostWithRelations` type (not `Post`) for components that need nested data
- CSS-only animations (no Framer Motion) - hardware-accelerated transforms
- Responsive: 375px to 1920px

## Performance Targets

- Initial load: <2.5s
- Lighthouse score: 90+
- Accessibility: alt tags, heading hierarchy, keyboard navigation

## Known Issues

### React Hydration Errors
Avoid wrapping entire cards in `<Link>`. Link specific elements instead:
```typescript
// ✅ Correct
<article>
  <Link href={postUrl}><h3>{title}</h3></Link>
  <HashtagList /> {/* Links work independently */}
</article>
```

### Filter State Management
- Add `scroll: false` to router.push: `router.push(\`/?\${queryString}\`, { scroll: false })`
- Wrap PostGrid in Suspense with unique key for partial re-renders

### Pagination Scroll Behavior
Use sessionStorage to persist scroll flag across component remounts:
```typescript
const SCROLL_FLAG_KEY = 'pagination-should-scroll'
sessionStorage.setItem(SCROLL_FLAG_KEY, 'true')
```

### View Counter Double Counting (StrictMode)
Use module-level Set to track processed slugs:
```typescript
const processedSlugs = new Set<string>()
```

### Infinite Scroll Pattern
Use Intersection Observer with `threshold: 0.1, rootMargin: '100px'`.

## Image Optimization

- All images use Next.js `<Image>` component
- Lazy loading with `loading="lazy"`
- Responsive sizes: `sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"`
- Supabase Storage structure: `/thumbnails/YYYY/MM/filename.jpg`

## Animation Performance

- CSS-only animations (removed Framer Motion for bundle size reduction)
- Hardware-accelerated transforms (scale, opacity, translateY)
- Staggered fade-in using CSS `animation-delay`
- 200-300ms transition duration
