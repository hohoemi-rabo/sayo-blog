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

## Header CTA Hierarchy (公開ヘッダー)

公開ヘッダー (`Header.tsx`) の 2 つの CTA は視覚ヒエラルキーを付けている:
- **主役「取材を依頼」** (`/request/interview`): ピンク〜コーラルのグラデ `from-[#ED93B1] to-[#D85A30]` + 柔らかい glow shadow + `hover:-translate-y-0.5` で浮き上がり。白文字に `text-shadow` を足してグラデ左端でもコントラスト確保。
- **脇役「情報を届ける」** (`/request/post`): 枠付きゴースト (`border-primary/40` + `text-primary`)、hover で枠を濃く。主役を引き立てる。
- 注意: `primary-hover` (#FF8FB3) は primary (#FF6B9D) より**明るい**ため、塗り CTA の hover に使うと白文字が同化する。塗りボタンの hover は `brightness-95` 等で**暗く**する。

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

## 独立 LP (`(lp)` グループ) — 投稿記事 / 取材記事

サイト本体とは**別のビジュアル体系**を持つチラシ調の独立 LP が 2 本ある。どちらも
`index_mini.html` / `index_long.html` (紗代さんと相談したプロトタイプ) の忠実移植。

> **プロトタイプ HTML はリポジトリに残していない** (移植完了後に削除)。以後は
> `lp-post.css` / `lp-long.css` が**正本**。元ファイルを見たい場合は git 履歴から辿ること
> (`index_long.html` は commit 4ac0d4b まで存在)。

| LP | URL | CSS | スコープ | パレット |
|----|-----|-----|---------|---------|
| 投稿記事 (内部名 mini) | `/request/post` | `lp-post.css` | `.lp-post` | 鮮やかピンク `#e91e63` |
| 取材記事 (内部名 long) | `/request/interview` | `lp-long.css` | `.lp-long` | くすんだローズ `#C08B8B` |

### ⚠️ CSS スコープ設計 (最重要)

**両 LP はクラス名が完全に同一** (`.hero` `.card` `.btn` `.section` `.faq` `.plan` …) で
**パレットだけ違う**。そのため:

- `(lp)/layout.tsx` は **フォント変数の提供のみ** (Cormorant / Shippori Mincho / Zen Kaku を
  next/font で self-host)。**ここで LP の CSS を import してはいけない** (グループ全体に効いて衝突する)。
- 各 LP の CSS は**ルートごとの layout** で読む:
  `(lp)/request/post/layout.tsx` → `lp-post.css` + `<div className="lp-post">`
  `(lp)/request/interview/layout.tsx` → `lp-long.css` + `<div className="lp-long">`
- 全セレクタに `.lp-post` / `.lp-long` プレフィックスを必ず付ける。**プレフィックスを外すと
  もう片方の LP と衝突する** (クライアント遷移で両方の CSS が DOM に残るケースがあるため、
  ルート単位の CSS 分割だけでは守れない)。
- 新しい独立 LP を足すときも、この「専用スコープクラス + ルート layout で CSS を読む」形を踏襲する。

### `lp-long.css` の注意 (プロトタイプ由来)

`index_long.html` は**テーマを4回上書きで重ねた作業ファイル** (`:root` が 4 つ)。完成形は
4 層の**カスケード結果**で決まる (先行レイヤーにしか無い `.wrap` `.flow` `.planwrap` `h1` 等も生きている)。
そのため **層を統合せず定義順をそのまま保持**している。整理したい場合はブラウザで実効スタイルを
確認しながら行うこと。最終的に効くパレットは `--magenta:#C08B8B` / `--coral:#E7A1A1` / `--blush:#F6E6E2`。

### フォーム

LP のクラス (`.lp-form` `.lp-input` `.lp-choice` …) で組むが、**backend は既存 Server Action を
そのまま再利用**する (サイト UI 部品 `Input`/`Button` は使わない)。
- `MiniLpForm.tsx` → `submitMiniInquiry`
- `LongLpForm.tsx` → `submitLongInquiry` (種別で必須項目を出し分け + 希望プラン選択 `.lp-plan-choice`)

`index_long.html` にフォームは無いため、取材 LP のフォーム部品は投稿記事 LP から
`.lp-long` パレットに合わせて移植したもの。

- framer-motion 不使用の方針は LP でも同じ (CSS のみ)。
- LP は SEO 的に孤立しないよう、ヘッダー/フッターからサイト本体へ内部リンクする (`.nav-site` / `.footer-links`)。

## Photo Gallery (/gallery)

公開記事の画像を一覧し、クリックで該当記事へ直行する写真ファースト導線。仕様正本は `docs/REQUIREMENTS-gallery.md`。

- **レイアウト**: CSS columns ベースの masonry (`columns-2 sm:columns-3 lg:columns-4`)。各タイルは `break-inside-avoid` で列跨ぎを防ぐ。framer-motion 不使用の既存方針通り、ライブラリは入れない。
- **タイル** (`GalleryTile.tsx`): `<Link>` で記事へ直行 (**ライトボックスは作らない**)。ホバーで scale + 下からタイトル/キャプションのオーバーレイ。ピン留め画像は左上に「★ Pick」バッジ。
- **画像**: `next/image` (`width/height` は暫定値 + `h-auto w-full`、`loading="lazy"`)。width/height の実寸取得による CLS 最適化は MVP では割り切り (masonry なので多少のシフトは許容)。
- **追加読込**: 「もっと見る」ボタン (既存 `InfinitePostGrid` 踏襲)。`/api/gallery?offset=&limit=&seed=` が RPC をラップ。
- **並び順 (ランダム)**: ピン留め → シード付きランダム。`page.tsx` は force-dynamic で訪問ごとに `generateGallerySeed()` を生成し、初回 SSR と「もっと見る」で同じ seed を共有する。これでページングが安定 (重複・欠落なし) しつつリロードのたびに並びが変わる。素の `ORDER BY random()` は offset ページングで重複/欠落するため使わない。RPC 側は `md5(画像id || seed)` の決定的順序 (migration `20260630120000`)。
- **フォーカスリング**: タイルは `focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`。ブラウザ標準 outline を消してサイト色のリングに置換 (キーボード操作時のみ表示, アクセシビリティ用なので残す)。
- **導線**: ヘッダー/フッターのナビに「ギャラリー」。SEO は index 許可 + ImageGallery JSON-LD + sitemap 掲載。
