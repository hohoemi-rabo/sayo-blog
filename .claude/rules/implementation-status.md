# Implementation Status

## Completed Tickets

### Phase 1
- Ticket 01: Project Setup
- Ticket 02: Database Schema
- Ticket 03: Design System
- Ticket 04: Top Page Layout
- Ticket 05: Filter System
- Ticket 06: Card Grid & Post Cards
- Ticket 07: Post Loading (infinite scroll)
- Ticket 08: Article Page
- Ticket 09: Search Functionality
- Ticket 10: Popular Hashtags Cloud
- Ticket 11: Data Migration
- Ticket 12: SEO & Metadata
- Ticket 17: Admin Panel (complete CMS)

### Interactive Enhancements
- Ticket 15: Interactive Enhancements (scroll progress, TOC, lightbox, reactions, related articles, scroll animations)

### Phase 2 (AI Chat Page) — All Complete
- Ticket 20: DB Schema & pgvector
- Ticket 21: Routing & Navigation
- Ticket 22: Knowledge Admin CRUD
- Ticket 23: Knowledge Generation & Embedding
- Ticket 24: AI Chat API (Vector Search + Gemini + SSE)
- Ticket 25: AI Chat Page UI
- Ticket 26: Usage Limits & Error Handling
- Ticket 27: AI Prompt Tags
- Ticket 28: AI Analytics Dashboard

### Phase 3 (Blog × Instagram) — In Progress
- Ticket 29: 共通基盤 (DB 4 テーブル + Storage + 型 + Sidebar) ✅
- Ticket 30: ブログ→IG AI キャプション生成ライブラリ ✅
- Ticket 31: IG 投稿管理 CRUD (API + 管理画面 UI, セクション選択式) ✅
- Ticket 32: 自動下書き生成 + 記事編集画面統合 (after() + 全セクション自動生成, AutoGenerateSettings, IgPostsSection) ✅
- Ticket 33: Graph API 直接投稿 (未着手)
- Ticket 34: IG 取得先アカウント管理 (CRUD + Cowork 指示書 DL ボタン配置) ✅
- Ticket 35: Cowork CSV 取り込み (CSV+画像アップロード, Server Action, Cowork 指示書配信) ✅
- Ticket 36: 取得投稿管理画面 (未着手 / カルーセル画像選択 UI 追加)
- Ticket 37: AI 記事再構成 + イベント情報抽出 (未着手 / posts に event カラム追加, 構造化抽出仕様追加)
- Ticket 38: NextAuth.js v5 Google OAuth 移行 (未着手)
- Ticket 39: 統合テスト & ドキュメント最終化 (未着手)

## Key File Map

### Pages
- `src/app/(public)/page.tsx` - Home (Hero + Pick Up featured/latest 6 posts, ISR 600s)
- `src/app/(public)/blog/page.tsx` - Blog listing ("もっと見る" button, force-dynamic)
- `src/app/(public)/[category]/page.tsx` - Category listing (React.cache + force-dynamic)
- `src/app/(public)/[category]/[slug]/page.tsx` - Article (ISR 3600s, React.cache for dedup)
- `src/app/(public)/chat/page.tsx` - AI Chat (ChatPage: dynamic import, admin-only)
- `src/app/(public)/about/page.tsx` - About (FUNE profile + specialties + Instagram CTA)
- `src/app/(public)/privacy/page.tsx` - Privacy Policy
- `src/app/(public)/search/page.tsx` - Search (dynamic)
- `src/app/(chat)/layout.tsx` - AI Chat layout (kept for future)
- `src/app/not-found.tsx` - Custom 404 page
- `src/app/(admin)/admin/` - Admin panel

### Components
- `src/components/InfinitePostGrid.tsx` - Client Component, "もっと見る" button load more
- `src/components/PostGrid.tsx` - Server Component, for search page
- `src/components/FilterBar.tsx` - Category/hashtag/sort filter
- `src/components/SearchBar.tsx` - Search with autocomplete
- `src/components/GoogleAnalytics.tsx` - GA4 (env var based)
- `src/components/ScrollProgress.tsx` - Scroll progress bar (CSS scaleX)
- `src/components/TableOfContents.tsx` - TOC with IntersectionObserver tracking
- `src/components/ImageLightbox.tsx` - Native `<dialog>` lightbox
- `src/components/ReactionBar.tsx` - Reaction buttons toggle (localStorage + Supabase)
- `src/components/RelatedArticles.tsx` - Server Component, scoring-based
- `src/components/ScrollFadeIn.tsx` - IntersectionObserver fade-in wrapper
- `src/components/EventEndedOverlay.tsx` - イベント終了記事のサムネ/ヒーロー画像オーバーレイ (mode: card | hero)

### Utilities
- `src/lib/types.ts` - TypeScript interfaces
- `src/lib/supabase.ts` - Server Supabase clients
- `src/lib/supabase-browser.ts` - Browser Supabase singleton
- `src/lib/site-config.ts` - Site-wide constants
- `src/lib/seo-utils.ts` - SEO utilities
- `src/lib/structured-data.tsx` - JSON-LD generators
- `src/lib/article-utils.ts` - HTML heading extraction + id assignment for TOC

### SEO
- `src/app/robots.ts` - robots.txt configuration
- `src/app/sitemap.ts` - Dynamic sitemap generation

### AI / Knowledge
- `src/lib/gemini.ts` - Gemini API client singleton
- `src/lib/knowledge-generator.ts` - Knowledge generation + embedding logic
- `src/lib/ai-prompt.ts` - FUNE system prompt + context builder
- `src/lib/ai-chat.ts` - Chat validation + post-processing helpers
- `src/lib/ai-chat-client.ts` - SSE client async generator for chat UI
- `src/app/api/ai/chat/route.ts` - AI Chat SSE streaming API
- `src/app/api/ai/tags/route.ts` - Prompt tags GET API
- `src/app/api/admin/ai/knowledge/generate/route.ts` - Bulk generation SSE API
- `src/app/api/admin/ai/tags/generate/route.ts` - AI tag generation API

### AI Analytics
- `src/app/(admin)/admin/ai/analytics/page.tsx` - Analytics dashboard
- `src/app/(admin)/admin/ai/analytics/actions.ts` - Stats & limit Server Actions
- `src/app/(admin)/admin/ai/analytics/_components/StatsCards.tsx` - 4 stat cards
- `src/app/(admin)/admin/ai/analytics/_components/UsageChart.tsx` - Daily usage bar chart (CSS)
- `src/app/(admin)/admin/ai/analytics/_components/TopQueries.tsx` - Top 10 queries
- `src/app/(admin)/admin/ai/analytics/_components/LimitSettings.tsx` - Limit management forms

### AI Chat Components
- `src/components/ai/ChatHeader.tsx` - Simplified header (logo + blog link only)
- `src/components/ai/ChatPage.tsx` - Main Client Component (state + SSE, dynamically imported)
- `src/components/ai/WelcomeScreen.tsx` - Server Component, greeting text (no avatar, centered)
- `src/components/ai/ChatMessages.tsx` - Message list container
- `src/components/ai/ChatMessage.tsx` - Individual message (responsive + markdown)
- `src/components/ai/ChatInput.tsx` - Gemini-style rounded input box + send/stop
- `src/components/ai/ChatArticleCard.tsx` - Compact article card
- `src/components/ai/ChatSpotCard.tsx` - Spot info card
- `src/components/ai/ChatSuggestions.tsx` - Tag suggestion chips
- `src/components/ai/ChatTagList.tsx` - Prompt tag pills

### API Routes
- `src/app/api/posts/route.ts` - Posts API (infinite scroll)
- `src/app/api/search/suggest/route.ts` - Search autocomplete
- `src/app/api/admin/media/route.ts` - Media list API
- `src/app/api/reactions/route.ts` - Reaction counts (GET/POST/DELETE, uses RPC)

### Phase 3: Instagram Integration
- `src/lib/admin-auth.ts` - requireAdminAuth() / assertAdminAuth() 共通ヘルパー
- `src/lib/post-sections.ts` - 記事 HTML を h2 単位でセクション分割
- `src/lib/ig-caption-prompt.ts` - Gemini プロンプト組み立て + assembleCaptionText
- `src/lib/ig-caption-generator.ts` - generateIgCaptions() キャプション生成本体 (セクションモード)
- `src/lib/ig-settings.ts` - ig_settings 読み書き (getIgSetting / updateIgSetting)
- `src/lib/ig-auto-generator.ts` - triggerIgAutoGenerate() 公開時の自動下書き生成
- `src/app/(admin)/admin/instagram/page.tsx` - /admin/instagram/posts へのリダイレクト
- `src/app/(admin)/admin/instagram/posts/page.tsx` - IG 投稿管理 (force-dynamic, auto-generate 設定表示)
- `src/app/(admin)/admin/instagram/posts/actions.ts` - Server Actions (CRUD + auto-generate 設定)
- `src/app/(admin)/admin/instagram/posts/filters.ts` - parseIgPostStatus (同期ヘルパー)
- `src/app/(admin)/admin/instagram/posts/_components/IgPostsClient.tsx` - フィルター + カードグリッド
- `src/app/(admin)/admin/instagram/posts/_components/IgPostCard.tsx` - カード (Graph API ボタンは Ticket 33 で実装予定)
- `src/app/(admin)/admin/instagram/posts/_components/IgPostEditDialog.tsx` - caption 一本編集
- `src/app/(admin)/admin/instagram/posts/_components/GenerateDialog.tsx` - セクション選択式生成 (lockedPostId 対応)
- `src/app/(admin)/admin/instagram/posts/_components/AutoGenerateSettings.tsx` - 公開時自動生成 ON/OFF トグル
- `src/components/admin/posts/IgPostsSection.tsx` - 記事編集画面の IG セクション
- `src/app/api/admin/instagram/posts/route.ts` - GET (一覧) / POST (生成)
- `src/app/api/admin/instagram/posts/[id]/route.ts` - PATCH / DELETE
- `src/app/api/admin/instagram/generate/route.ts` - POST 生成エイリアス
- `src/lib/ig-action-utils.ts` - 共通 ActionResult / withRetry / friendlyDbError / isUniqueViolation
- `src/app/(admin)/admin/instagram/sources/page.tsx` - IG 取得先アカウント管理 (force-dynamic)
- `src/app/(admin)/admin/instagram/sources/actions.ts` - Server Actions (getIgSources / create / update / delete / getRelatedImportedCount)
- `src/app/(admin)/admin/instagram/sources/filters.ts` - parseIgPermissionStatus / parseIgActiveFilter (同期ヘルパー)
- `src/app/(admin)/admin/instagram/sources/_components/SourcesClient.tsx` - フィルター + テーブル + ダイアログ状態
- `src/app/(admin)/admin/instagram/sources/_components/SourceRow.tsx` - テーブル行 (is_active インライン切替, 削除確認)
- `src/app/(admin)/admin/instagram/sources/_components/SourceDialog.tsx` - 新規/編集ダイアログ (共通)
- `src/app/(admin)/admin/instagram/sources/_components/CoworkPromptDownloadButton.tsx` - approved+active のみ有効、Ticket 35 のルートを download 属性で叩く
- `src/app/api/admin/instagram/sources/route.ts` - GET (一覧+フィルタ) / POST (新規, 重複時 409)
- `src/app/api/admin/instagram/sources/[id]/route.ts` - PATCH (更新, 重複時 409) / DELETE
- `src/lib/ig-csv-parser.ts` - Cowork CSV パース + 画像名照合 + username 検証 (browser/server 両用)
- `src/lib/ig-import-storage.ts` - 画像 Storage アップロード (ig-imported, withRetry, 10MB 制限)
- `src/app/(admin)/admin/instagram/sources/[id]/cowork-prompt.txt/route.ts` - GET アカウント別 Cowork 指示書配信
- `src/app/(admin)/admin/instagram/imports/sample.csv/route.ts` - GET サンプル CSV 配信 (UTF-8 BOM 付き、Excel 文字化け対策)
- `src/app/(admin)/admin/instagram/imports/page.tsx` - /upload への暫定 redirect (Ticket 36 で一覧画面に置き換え)
- `src/app/(admin)/admin/instagram/imports/upload/page.tsx` - 取り込み UI (force-dynamic, approved+active のみ)
- `src/app/(admin)/admin/instagram/imports/upload/actions.ts` - uploadIgImports (CSV→画像→DB INSERT、ON CONFLICT skip、last_fetched_at 更新)
- `src/app/(admin)/admin/instagram/imports/upload/_components/UploadClient.tsx` - 3 ステップフォーム + Drag&Drop + 検証
- `src/app/(admin)/admin/instagram/imports/upload/_components/CsvPreview.tsx` - パース結果プレビューテーブル
- `src/app/(admin)/admin/instagram/imports/upload/_components/ValidationSummary.tsx` - 検証結果サマリー
- `supabase/migrations/20260429045435_add_ig_imports_columns.sql` - comment_count / selected_image_indexes 追加
