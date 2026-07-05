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
- Ticket 42: ロング記事 CRM (公開フォーム /request/long + 案件管理 7段階ステータス/取材日/金額/記事紐付け + 自動公開連動 + ArticleTypeBadge 公開表示) ✅

### 画像ギャラリー (Gallery) — Complete
チケット番号は付けず `docs/REQUIREMENTS-gallery.md` を仕様の正本とする。テキスト導線に対し「写真から記事に入る」導線を追加。
- DB: `post_images` テーブル + RLS + 部分インデックス + RPC `get_gallery_images` ✅
- 抽出/同期: `extractPostImages` (純粋・正規表現のみ・テスト12件) + `syncPostImages` (記事保存/ミニ生成にフック, delete→insert 冪等) ✅
- 公開: `/gallery` (masonry → 記事直行, ライトボックス無し) + `/api/gallery` (もっと見る) + ヘッダー/フッター導線 + ImageGallery JSON-LD + sitemap ✅
- 管理: `/admin/gallery` (表示 ON/OFF + ピン留めのみ。アップロード/削除はしない) + Sidebar 項目 ✅
- backfill: `scripts/backfill-post-images.ts` (`npm run backfill:gallery`) で既存記事を一括取り込み済み ✅

### 記事クラフト (チラシ / メモ → 記事) — Ticket 43 Complete
仕様: `docs/43_craft-from-flyer-memo.md`。文体プロファイル正本: `docs/writing-style-profile.md`。

紗代さんの文体を保ったまま、チラシ画像/PDF (vision) やメモから記事の下書きを生成する。
- 文体担保はハイブリッド: 固定の**文体プロファイル** (`docs/writing-style-profile.md`, 96記事精読で作成) + **題材が近い自由記事 2〜3本を全96件から自動選定** (`selectStyleExamples`, 埋め込みではなくカテゴリ＋キーワード重なり)。
- 生成は 2 パス: 抽出 (vision, 素材を忠実に整理) → 執筆 (FUNE 文体の h2 構造記事)。出力は `IgArticleAiOutput` 互換。
- 捏造防止: 素材に無い体験/数値は書かず、薄い箇所は `※ここに実際の取材・体験の内容を加筆してください` を挿入。生成本文に `<img>` は入れない (写真は編集画面で手動挿入 = 次フェーズ)。
- 保存: `posts` (article_type='free', is_published=false) へ INSERT → `/admin/posts/[id]` 編集画面へ。
- 導線: `/admin/posts`「新規作成」→ `/admin/posts/create` (3枚カード) → 📄チラシ / 📝メモ は `/admin/posts/craft?mode=`、✍️自分で書く は既存 `/admin/posts/new`。
- ファイル: `src/lib/writing-style.ts` (md ローダー) / `craft-inputs.ts` / `craft-example-selector.ts` / `craft-article-prompt.ts` / `craft-article-generator.ts` / `article-ai-shared.ts` に `callGeminiParsed`・`callGeminiForArticleParts`・`parseJsonLoose` 追加 / `api/admin/posts/craft/route.ts` (multipart, maxDuration=60) / `admin/posts/create/page.tsx` / `admin/posts/craft/{page.tsx,_components/CraftForm.tsx}` / `next.config.ts` に `outputFileTracingIncludes` (md 同梱)。DB マイグレーションなし。

### AI 3段階要約 (さくっと / ほどよく / じっくり) — Complete
仕様: `docs/ai-summary-feature.md`。長文記事の内容を、読む前に好みの長さで掴めるようにする。

- 生成: 本文 (posts.content = Tiptap HTML) を HTML 除去 → Gemini で3段階要約。既存 `article-ai-shared.ts::callGeminiParsed` (リトライ+バックオフ内蔵) 経由。モデルは env `GEMINI_MODEL`。
- DB: `posts` に `summary_short/summary_medium/summary_long` (TEXT NULL) 追加。未生成 (NULL) は公開側で自動非表示。取得は詳細ページの `select('*')` に自動的に乗る。
- 管理: 記事編集サイドバーの `SummarySection` で「AIで生成」(3つ一括) / レベル別「再生成」+ textarea 手直し + 文字数カウンター。値は PostForm に lift し createPost/updatePost で保存。
- 公開: 記事詳細の本文上部に `SummarySlider`。3分割セグメントの背景を **CSS transform でスライド** (framer-motion 不使用)、本文は `key` 差し替え + `animate-slide-in-up`。
- ファイル: `supabase/migrations/20260705134915_add_posts_summary.sql` / `src/lib/summary-levels.ts` (レベル定数=Client安全) / `src/lib/summary-generator.ts` (生成=Server) / `admin/posts/_components/SummarySection.tsx` / `admin/posts/actions.ts` に `generateAISummaries`・`generateAISingleSummary` + 保存対応 / `src/components/SummarySlider.tsx` / 詳細ページに配置。
- backfill: `scripts/backfill-summaries.ts` (`npm run backfill:summaries`) で既存記事を一括生成 (冪等・既存スキップ・`--limit`/`--force`)。既存96記事に生成済み (失敗0)。

## Key File Map

### Pages
- `src/app/(public)/page.tsx` - Home (Hero + Pick Up featured/latest 6 posts, ISR 600s)
- `src/app/(public)/blog/page.tsx` - Blog listing ("もっと見る" button, force-dynamic)
- `src/app/(public)/[category]/page.tsx` - Category listing (React.cache + force-dynamic)
- `src/app/(public)/[category]/[slug]/page.tsx` - Article (ISR 3600s, React.cache for dedup)
- `src/app/(chat)/chat/page.tsx` - AI Chat (ChatPage: dynamic import, admin-only)
- `src/app/(public)/about/page.tsx` - About (FUNE profile + specialties + 3 つの記事のかたち + 情報窓口 CTA + Instagram CTA)
- `src/app/(public)/privacy/page.tsx` - Privacy Policy
- `src/app/(public)/search/page.tsx` - Search (dynamic)
- `src/app/(chat)/layout.tsx` - AI Chat 専用 layout (公開 Header + main を `h-[calc(100dvh-Xrem)] overflow-hidden`、Footer 無し)。(public) の `min-h-screen + Footer` による body 余剰スクロール問題を避けるため Phase 4 後に活性化
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
- `src/components/ai/ChatHeader.tsx` - 簡易ヘッダー (logo + blog link)。**現在不使用** ((chat)/layout.tsx が公開 Header を使うようになったため。再導入する場合の参考用に残置)
- `src/components/ai/ChatPage.tsx` - Main Client Component (state + SSE, dynamically imported)
- `src/components/ai/WelcomeScreen.tsx` - Server Component, greeting text (no avatar, centered)
- `src/components/ai/ChatMessages.tsx` - Message list container
- `src/components/ai/ChatMessage.tsx` - Individual message (responsive + markdown)
- `src/components/ai/ChatInput.tsx` - Gemini-style rounded input box + send/stop
- `src/components/ai/ChatArticleCard.tsx` - Compact article card
- `src/components/ai/ChatSpotCard.tsx` - Spot info card
- `src/components/ai/ChatSuggestions.tsx` - Tag suggestion chips
- `src/components/ai/ChatTagList.tsx` - Prompt tag pills

#### AI Chat UI 改善まとめ (2026-05-28)

ChatGPT/Gemini/Claude 風の体感に揃えるため、以下の挙動を追加・修正済み:

- **レイアウト**: chat ページを `(public)` から `(chat)` ルートグループへ移動。`(chat)/layout.tsx` は公開 Header + `main h-[calc(100dvh-Xrem)] overflow-hidden` (Footer 無し)。これで body 余剰スクロール (二重スクロールバー) が構造的に発生しない。
- **flex+overflow の min-h-0**: `ChatPage` ルート / conversation / `ChatMessages` すべての flex 列に `min-h-0` を付与。これが無いと flex 子が中身の高さに膨らみ、内部 `overflow-y-auto` が機能せず一番上のメッセージが見えなくなる古典バグ。
- **タイプライタ**: `ChatPage.tsx` の `typewriterRef` で受信した text チャンクを 50ms 間隔・バックログ加速 (`/150`) で文字単位に可視化。`done` イベントは「ペンディング全て吐き切ったら finalize」に変更し、表示完了まで `isStreaming=true` を維持 (入力欄 disable 継続)。
- **SSE バッファ抑制**: `api/ai/chat/route.ts` の Response ヘッダに `X-Accel-Buffering: no` と `Cache-Control: no-transform` を付与 (Vercel/プロキシでの溜め込み防止)。
- **マーカー処理**: AI 出力中の `[[slug]]` (記事リンク) と `{{spot:name}}` は `ChatMessage.tsx::cleanMarkers` で除去。ストリーミング途中で半分だけ届く `[[arashima]` のような中間状態が一瞬見える問題を、「最後の `[[` から先に `]]` が無ければ全部隠す」探索ロジックで解消 (regex `/\[\[[^\]]*$/` だと `]` 1 個入った瞬間にマッチが切れて漏れる)。
- **自動スクロール**: `ChatMessages.tsx` でスクロール位置を監視し、新メッセージ追加時は smooth スクロール、ストリーミング中の content 更新は「最下部から 80px 以内なら追従、上にスクロールしたら追従停止」。
- **カードのスタガー**: 記事カード/スポットカードを 350ms ずつ遅延付きの `animate-slide-in-up` で順次表示 (下からふわっと)。
- **文字サイズ**: 吹き出し本文 `text-lg` (18px)、prose `prose-lg`。AI 返信は `w-full` で会話エリア (`max-w-3xl`) いっぱい。

### API Routes
- `src/app/api/posts/route.ts` - Posts API (infinite scroll)
- `src/app/api/search/suggest/route.ts` - Search autocomplete
- `src/app/api/admin/media/route.ts` - Media list API
- `src/app/api/reactions/route.ts` - Reaction counts (GET/POST/DELETE, uses RPC)
- `src/app/api/keepalive/route.ts` - Supabase スリープ防止 (Vercel Cron 用)。`force-dynamic` + `Authorization: Bearer ${CRON_SECRET}` 検証 → `categories` へ `head:true/count:'exact'` の軽量クエリ (実 DB アクティビティを発生させスリープを防ぐ)。成功 200 `{ok,count,timestamp}` / 認証失敗 401 / クエリ失敗 500
  - `vercel.json` の `crons` で 1 日 1 回呼び出し (`schedule: "0 3 * * *"` = JST 12:00)。Hobby プランは 1日1回まで・Supabase は 7日無アクティビティで停止のため十分。env `CRON_SECRET` を Vercel に登録 (Vercel Cron が自動で Bearer 付与)

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
- `src/components/Header.tsx` - 公開ヘッダーに「情報を届ける」「取材を依頼」CTA (PC/SP)。主役の「取材を依頼」はピンク〜コーラルのグラデ + glow + hover 浮き上がり、脇役の「情報を届ける」は枠付きゴーストで視覚ヒエラルキーを付けている
- `src/app/(public)/about/page.tsx` - 「3 つの記事のかたち」セクション + /request/mini, /request/long CTA

> `/request/long` 公開フォームは Ticket 42 で実装済み (ComingSoon から差し替え)。

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
- `src/app/(admin)/admin/inquiries/actions.ts` - getMiniInquiry / updateMiniInquiryStatus / updateMiniInquiryNotes / deleteMiniInquiry (画像も掃除) / uploadAdditionalInquiryImages 追加
- `src/app/(admin)/admin/posts/actions.ts` - deletePost: ミニ記事の削除時に紐づく依頼を pending へ戻す (画像は依頼の持ち物として残す)
- `src/components/admin/Sidebar.tsx` - 「依頼管理」に未読 (pending) 件数の赤バッジ
- `src/app/(admin)/admin/layout.tsx` - Sidebar へ pending 件数を注入
- `src/lib/ig-article-generator.ts` (+ `ig-article-prompt`/`ig-article-credit`/`ig-article-images`) - 不使用化 (純粋ヘルパーは article-ai-shared に集約)

#### 記事一覧の出自タブ (Ticket 41 追加 / Ticket 42 の article_type を前倒し導入)
- `supabase/migrations/20260525150000_add_posts_article_type.sql` - posts.article_type (free/mini/long) + CHECK + idx + 既存ミニ記事のバックフィル
- `src/app/(admin)/admin/posts/page.tsx` - type searchParam (既定 free) + getPostTypeCounts
- `src/app/(admin)/admin/posts/actions.ts` - getPosts に articleType フィルタ / getPostTypeCounts / getImportedOrigin は null 返しに簡素化 (削除済み ig_imported_posts 参照を撤去)
- `src/app/(admin)/admin/posts/_components/PostList.tsx` - 出自タブバー (自由/ミニ/ロング + 件数) + タイトル列バッジ
- 公開側・PostForm は無変更。新規作成は free 固定、ミニ生成は mini 固定

### Phase 4: ロング記事 CRM (Ticket 42)
- `src/lib/inquiry-schema.ts` - longInquirySchema 追加 (種別ごと superRefine + 取材内容 200〜2000字)
- `src/app/(public)/request/long/page.tsx` - ランディング + フォーム (ComingSoon から差し替え)
- `src/app/(public)/request/long/actions.ts` - submitLongInquiry (BotID + レート制限 + ハニーポット + Zod + INSERT + メール)
- `src/app/(public)/request/long/_components/LongRequestForm.tsx` - 種別 (個人/組織/団体) で必須項目を出し分け
- `src/app/(public)/request/long/thanks/page.tsx` - 完了画面 (noindex)
- `src/instrumentation-client.ts` - BotID protect に /request/long POST を追加
- `src/app/(admin)/admin/inquiries/_components/LongInquiriesList.tsx` - Client 化 + フィルタ + 操作列
- `src/app/(admin)/admin/inquiries/_components/LongInquiryDetailDialog.tsx` - 依頼情報 + 案件管理 (7段階ステータス + scheduled_at + fee_amount + 紐付け Select + 「新規記事を作成」) + メモ + 削除
- `src/app/(admin)/admin/inquiries/actions.ts` - getLongInquiry / updateLongInquiryStatus(options) / updateLongInquiryNotes / deleteLongInquiry / linkInquiryToPost (mini不可+article_type自動フリップ) / unlinkInquiryFromPost / getLinkablePosts 追加
- `src/app/(admin)/admin/posts/actions.ts` - createPost(data, { linkLongInquiryId }) + article_type フィールド対応 / updatePost: false→true で公開化したとき紐づくロング依頼を 'published' に自動更新
- `src/app/(admin)/admin/posts/new/page.tsx` - ?from_inquiry=long&id=... を受け、依頼ラベル + forcedArticleType='long' を PostForm に渡す
- `src/app/(admin)/admin/posts/_components/PostForm.tsx` - linkLongInquiryId / forcedArticleType props + 取材依頼バナー + createPost への options 受け渡し
- `src/components/ArticleTypeBadge.tsx` - 📩ミニ記事 / ✍️取材記事 (free は描画なし)
- `src/app/(public)/[category]/[slug]/page.tsx` - ヒーロー上部に ArticleTypeBadge を表示
- 取材依頼の画像アップロード無し (申込情報のみ)。AI 記事生成も無い (紗代さん本人が現地取材して書く)

### 画像ギャラリー (Gallery)
仕様正本: `docs/REQUIREMENTS-gallery.md` (作るもの/作らないものを明記)。

- `supabase/migrations/20260621215056_add_post_images.sql` - post_images テーブル + RLS + 部分インデックス + RPC `get_gallery_images`
  - 注: リモートには別タイムスタンプ版 `20260621125402_add_post_images` が適用済み (内容は同一・全文冪等)。`db push` しても無害だが移行履歴に同名2件が残る点に留意
- `supabase/migrations/20260630120000_gallery_random_order.sql` - `get_gallery_images` を **ランダム並び (シード付き)** に変更。`p_seed text DEFAULT ''` 追加 + 並びを `is_featured DESC, md5(pi.id::text || p_seed), pi.id` に。旧2引数を DROP→再作成 (DEFAULT で後方互換)。本番 DB 適用済み
- `src/lib/post-images.ts` - `extractPostImages` (純粋関数・DOMパーサ不使用/正規表現のみ・DB非依存)。content 全体を走査し figure(figcaption付き) + 裸 img を出現順マージ、サムネは position=-1。`parsePostSections` は流用しない (理由は冒頭コメント)
- `src/lib/post-images.test.ts` - extractPostImages の単体テスト (`node --test`, 12 ケース)。tsconfig の build 対象からは除外 (`.ts` import が next build を壊すため)
- `src/lib/post-images-sync.ts` - `syncPostImages(postId)` (createAdminClient で delete→insert, 冪等, best-effort で throw しない)
- `src/lib/gallery.ts` - 公開側の型 `GalleryImage` + `GALLERY_PAGE_SIZE` + `galleryImageHref` / `galleryImageAlt` + `generateGallerySeed` (ランダム並び用シード)
- `src/app/(public)/gallery/page.tsx` - 公開ギャラリー (**force-dynamic**, 訪問ごとに seed 生成 → RPC で先頭ページ取得 + ImageGallery JSON-LD)
- `src/app/(public)/gallery/_components/InfiniteImageGrid.tsx` - masonry (CSS columns) + 「もっと見る」(既存 InfinitePostGrid 踏襲)。seed prop を受け取り `/api/gallery?...&seed=` に付与して同じランダム並びでページング
- `src/app/(public)/gallery/_components/GalleryTile.tsx` - 1 枚タイル (`<Link>` で記事直行, ホバーオーバーレイ, ★Pick バッジ)
- `src/app/api/gallery/route.ts` - 追加読込 API (RPC `get_gallery_images` ラップ, `seed` パラメータを RPC へ中継)
- `src/app/(admin)/admin/gallery/page.tsx` - 管理ギャラリー (force-dynamic, `?filter=all|visible|hidden|featured`)
- `src/app/(admin)/admin/gallery/actions.ts` - getGalleryAdminImages / getGalleryAdminCounts / toggleImageVisibility / toggleImageFeatured (mutation は assertAdminAuth + revalidate /admin/gallery と /gallery)
- `src/app/(admin)/admin/gallery/_components/GalleryAdminClient.tsx` - フィルタタブ + 件数バッジ + グリッド
- `src/app/(admin)/admin/gallery/_components/GalleryAdminCard.tsx` - 表示 ON/OFF + ピン留めトグル (useTransition 楽観的更新, 失敗時ロールバック)
- `src/components/admin/Sidebar.tsx` - メインナビに「ギャラリー」(Images アイコン)
- `src/components/Header.tsx` / `Footer.tsx` - 公開ナビに「ギャラリー」リンク
- `scripts/backfill-post-images.ts` (`npm run backfill:gallery`) - 既存記事を一括取り込み (冪等)。実行済み (96記事/1203枚)
- 同期トリガ: `posts/actions.ts` の createPost/updatePost と `mini-article-generator.ts` で `syncPostImages` を呼ぶ。公開トグル・本文/サムネ変更も updatePost 経由で追従、記事削除は FK CASCADE で post_images も消える
- SEO: `src/lib/structured-data.tsx::generateImageGallerySchema` + `src/app/sitemap.ts` に /gallery 追加
