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
- Ticket 33: Graph API 直接投稿 (保留 — Phase 4 後に再検討)
- Ticket 34: IG 取得先アカウント管理 ❌ 廃止 (Ticket 40 で削除)
- Ticket 35: Cowork CSV 取り込み ❌ 廃止 (Ticket 40 で削除)
- Ticket 36: 取得投稿管理画面 ❌ 廃止 (Ticket 40 で削除)
- Ticket 37: AI 記事再構成 + イベント情報抽出 + クレジット ✅ (純粋ヘルパーは Ticket 41 で `article-ai-shared.ts` に集約。`ig-article-*` は不使用化)
- Ticket 38: NextAuth.js v5 Google OAuth 移行 (未着手)
- Ticket 39: 統合テスト & ドキュメント最終化 (未着手)

### Phase 4 (情報窓口フォーム = 3 つの柱) — In Progress
Cowork CSV 取り込み (旧 Phase 3B) を廃止し、一般の方が情報を寄せる「情報窓口フォーム」に置き換え。
3 つの柱: 自由記事 (無料) / ミニ記事 (無料, SNS URL → AI 補助) / ロング記事 (有料 500円〜, 取材依頼)。
- Ticket 40: 共通基盤 + 既存 IG 取り込み削除 (mini_inquiries/long_inquiries + inquiry-images バケット + /admin/inquiries 枠 + ヘッダー/About 導線) ✅
- Ticket 41: ミニ記事フロー (公開フォーム /request/mini + BotID/Zod/レート制限 + Gmail SMTP 通知 + 管理画面詳細/ステータス/未読バッジ + AI たたき台生成) ✅
- Ticket 42: ロング記事 CRM (公開フォーム /request/long + 案件管理 + posts.article_type バッジ) (未着手)

## Key File Map

### Pages
- `src/app/(public)/page.tsx` - Home (Hero + Pick Up featured/latest 6 posts, ISR 600s)
- `src/app/(public)/blog/page.tsx` - Blog listing ("もっと見る" button, force-dynamic)
- `src/app/(public)/[category]/page.tsx` - Category listing (React.cache + force-dynamic)
- `src/app/(public)/[category]/[slug]/page.tsx` - Article (ISR 3600s, React.cache for dedup)
- `src/app/(public)/chat/page.tsx` - AI Chat (ChatPage: dynamic import, admin-only)
- `src/app/(public)/about/page.tsx` - About (FUNE profile + specialties + 3 つの記事のかたち + 情報窓口 CTA + Instagram CTA)
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

> **Ticket 40 で削除**: `instagram/sources/**`, `instagram/imports/**` (upload 含む), `api/admin/instagram/sources/**`, `api/admin/instagram/imports/**`, `src/lib/ig-csv-parser.ts`, `src/lib/ig-import-storage.ts` を全削除。`ig_sources` / `ig_imported_posts` テーブルと `ig-imported` バケットも削除。

### Phase 3B: Ticket 37 (AI 記事再構成) — ライブラリは Ticket 41 で再利用
- `src/lib/slug-utils.ts` - slugifyTitle / generateUniquePostSlug (event-{date} prefix 対応 + 衝突時サフィックス)
- `src/lib/ig-article-prompt.ts` - buildArticleFromIgPrompt (FUNE persona + JSON 出力スキーマ + イベント抽出ルール + クレジット)
- `src/lib/ig-article-credit.ts` - buildCreditHtml / ensureCreditSection (URL 含有チェック + 末尾補完)
- `src/lib/ig-article-images.ts` - injectImagesIntoArticle (h2 ごとに画像配分、N>M なら最後に集約)
- `src/lib/ig-article-generator.ts` - generateArticleFromIg (現在は未使用 / Ticket 41 でミニ記事生成に転用予定。`/admin/instagram/imports` への revalidatePath が残るが Ticket 41 で差し替え)
- `src/app/(admin)/admin/posts/_components/EventInfoSection.tsx` - イベント情報編集 UI (is_event チェック + 日付/時刻/会場/料金/URL)
- `src/app/(admin)/admin/posts/[id]/preview/page.tsx` - 下書きプレビュー (is_published フィルター無視, 公開記事と同じレンダリング, 上部に下書きバナー)
- `src/app/(admin)/admin/layout.tsx` - CHROMELESS_PATTERNS で preview 系ページの Sidebar/Header をスキップ
- `src/middleware.ts` - x-pathname ヘッダー注入 (admin layout が pathname を判定するため)
- `supabase/migrations/20260505111459_add_posts_event_columns.sql` - posts に 9 イベントカラム + idx_posts_event_date_partial

### Phase 4: 情報窓口フォーム (Ticket 40 = 共通基盤 + 既存 IG 削除)
- `supabase/migrations/20260523120000_phase4_inquiries_foundation.sql` - mini_inquiries / long_inquiries + inquiry-images バケット作成、ig_sources/ig_imported_posts DROP、下書きテスト記事 2 件削除
- `supabase/backups/20260523_phase4_ig_imports_backup.md` - 削除した IG テストデータの控え
- `src/lib/types.ts` - MiniInquiry / LongInquiry + 各ステータス・種別型を追加
- `src/lib/inquiries.ts` - ラベル定義 (種別/ステータス/公開希望) + 表示ヘルパー (formatMiniPublishPreference / formatClientName / formatRelativeTime)
- `src/app/(admin)/admin/inquiries/page.tsx` - 依頼管理 (force-dynamic, タブ切替 mini/long)
- `src/app/(admin)/admin/inquiries/actions.ts` - getInquiryCounts / getMiniInquiries / getLongInquiries
- `src/app/(admin)/admin/inquiries/filters.ts` - parseInquiryTab + InquiryCounts 型 (同期ヘルパー)
- `src/app/(admin)/admin/inquiries/_components/InquiriesTabs.tsx` - タブ + 件数バッジ
- `src/app/(admin)/admin/inquiries/_components/MiniInquiriesList.tsx` - ミニ記事一覧 (枠 + 空状態, 詳細/操作は Ticket 41)
- `src/app/(admin)/admin/inquiries/_components/LongInquiriesList.tsx` - ロング記事一覧 (枠 + 空状態, 詳細/操作は Ticket 42)
- `src/components/admin/Sidebar.tsx` - 「情報窓口 > 依頼管理」セクション追加、旧 sources/imports リンク削除
- `src/components/Header.tsx` - 公開ヘッダーに「情報を届ける」「取材を依頼」CTA (PC/SP)
- `src/app/(public)/about/page.tsx` - 「3 つの記事のかたち」セクション + /request/mini, /request/long CTA

> **Ticket 42 で作成予定**: `/request/long` 公開フォーム (現状はヘッダー/About のリンクのみ、ComingSoon)

### Phase 4: ミニ記事フロー (Ticket 41)
- `supabase/migrations/20260525090000_add_posts_source_urls.sql` - posts.source_urls text[] 追加 (ミニ記事の元 SNS URL 控え)
- `src/lib/mailer.ts` - Gmail SMTP (Nodemailer) 通知 sendInquiryNotification (失敗してもフォーム送信を止めない)
- `src/lib/rate-limit.ts` - in-memory IP レート制限 checkRateLimit (5分3件 MVP)
- `src/lib/inquiry-schema.ts` - Zod スキーマ miniInquirySchema + 画像制約定数
- `src/lib/inquiry-images.ts` - uploadInquiryImages (service role で inquiry-images へ保存)
- `src/instrumentation-client.ts` - Vercel BotID initBotId (/request/mini POST を保護)
- `src/lib/article-ai-shared.ts` - AI 記事生成の共通ヘルパー (Gemini リトライ/JSON 検証/イベント正規化/カテゴリ・タグ紐付け)
- `src/lib/mini-article-prompt.ts` - buildMiniArticlePrompt (最大5件 SNS本文 → 短文ミニ記事, h2/クレジットなし)
- `src/lib/mini-article-generator.ts` - generateMiniArticle (下書き posts 生成 + source_urls 控え + ミニ用画像配置)
- `src/app/(public)/request/mini/page.tsx` - ランディング + フォーム (ComingSoon から差し替え)
- `src/app/(public)/request/mini/actions.ts` - submitMiniInquiry (BotID + レート制限 + ハニーポット + Zod + 画像 + INSERT + メール)
- `src/app/(public)/request/mini/_components/MiniRequestForm.tsx` - 公開フォーム本体 (条件表示 + 画像プレビュー)
- `src/app/(public)/request/mini/thanks/page.tsx` - 送信完了画面 (noindex)
- `src/app/(admin)/admin/inquiries/_components/MiniInquiriesList.tsx` - フィルタ + 8カラム表 + 操作 (Client 化)
- `src/app/(admin)/admin/inquiries/_components/MiniInquiryDetailDialog.tsx` - 詳細 + 内部メモ編集 + ステータス操作
- `src/app/(admin)/admin/inquiries/[id]/generate/page.tsx` - 記事化画面 (提供情報の読み取り表示)
- `src/app/(admin)/admin/inquiries/[id]/generate/_components/GenerateForm.tsx` - 本文貼付 + 追加画像 + 生成呼び出し
- `src/app/api/admin/inquiries/[id]/generate/route.ts` - 生成 API (maxDuration=60)
- `src/app/(admin)/admin/inquiries/actions.ts` - getMiniInquiry / updateMiniInquiryStatus / updateMiniInquiryNotes / uploadAdditionalInquiryImages 追加
- `src/components/admin/Sidebar.tsx` - 「依頼管理」に未読 (pending) 件数の赤バッジ
- `src/app/(admin)/admin/layout.tsx` - Sidebar へ pending 件数を注入
- `src/lib/ig-article-generator.ts` (+ `ig-article-prompt`/`ig-article-credit`/`ig-article-images`) - 不使用化 (純粋ヘルパーは article-ai-shared に集約)
