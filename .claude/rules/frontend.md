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
- CSS-only animations — **never use framer-motion** (removed for bundle size)
- Responsive: 375px to 1920px

## Performance Targets

- Initial load: <2.5s
- Lighthouse score: 90+
- Accessibility: alt tags, heading hierarchy, keyboard navigation

## Animation System (CSS-only)

All animations use Tailwind utilities defined in `tailwind.config.ts` + `globals.css`. No JS animation libraries.

### Tailwind Animation Utilities
- `animate-fade-in` — opacity 0→1, 0.3s
- `animate-slide-in` — translateY(10px)→0 + opacity, 0.3s
- `animate-slide-in-up` — translateY(20px)→0 + opacity, 0.5s
- `animate-slide-in-left` — translateX(-20px)→0 + opacity, 0.3s
- `animate-fade-in-up` — defined in globals.css, 0.4s

### Stagger Delay Classes
Defined in `globals.css`:
```css
.stagger-1 { animation-delay: 100ms; }
.stagger-2 { animation-delay: 200ms; }
/* ... through .stagger-8 (800ms) */
```

### Usage Pattern
```tsx
<h1 className="animate-slide-in-up stagger-3">Title</h1>
<p className="animate-slide-in-up stagger-4">Subtitle</p>
```

All animations use `animation-fill-mode: both` (via Tailwind `both` keyword) so elements start hidden.

### Key Principles
- Hardware-accelerated transforms only (scale, opacity, translateX/Y)
- 200-500ms duration range
- Use `stagger-N` classes for sequential appearance
- Use `style={{ animationDelay }}` for dynamic stagger (e.g., list items)

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

## Event Ended Posts

`posts.event_ended === true` の記事はサムネイル/ヒーロー画像を `grayscale` 化し、
`<EventEndedOverlay mode="card" | "hero" />` を重ねて「終了済み」を伝える。
- `mode="card"` — `PostCard.tsx` のサムネ用。中央に「📅 このイベントは終了しています」ピル
- `mode="hero"` — 記事詳細 `ArticleHero.tsx` 用。下部の半透明バーに紗代さん指定の全文案内
- 通常時のヒーローのグラデーションは `eventEnded` 時は描画しない（オーバーレイと二重になるため）
- 一覧用の `<Image>` には条件付きで `grayscale` クラスを当てる
- 管理画面の記事一覧 `PostList.tsx` でも同フラグでサムネ白黒 + タイトル右に「📅 終了」ラベル
- フラグ自体は admin の記事編集「公開設定」カード内のチェックボックスで切替
