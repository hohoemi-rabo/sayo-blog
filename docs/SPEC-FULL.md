# SPEC-FULL.md — Sayo's Journal 完全仕様書

**プロジェクト名**: Sayo's Journal
**URL**: https://www.sayo-kotoba.com
**作成日**: 2026-04-03
**ステータス**: Phase 1 + Phase 2 完了、Phase 3 準備中

---

## 1. プロジェクト概要

ライター・インタビュアー本岡紗代のナラティブブログサイト。「言葉 × 写真 × 体験」を融合し、南信州（飯田・下伊那）の人・場所・記憶を発信する。

### 技術スタック

| 技術 | バージョン | 用途 |
|------|-----------|------|
| Next.js | 15.5.7 | App Router フレームワーク |
| React | 19.1.0 | UI ライブラリ |
| TypeScript | 5 | 型安全性 |
| Tailwind CSS | 3.4.17 | スタイリング |
| Supabase | 2.81.1 | PostgreSQL + pgvector + Storage + Auth |
| Google Gemini | 0.24.1 | AI 生成 (gemini-3-flash-preview) + 埋め込み (gemini-embedding-001) |
| Tiptap | 3.14.0 | リッチテキストエディタ (Admin) |
| lucide-react | 0.553.0 | アイコン |

### デザイン思想

**"Poetic Psychedelic × Decorative Narrative"**
- カラーパレット: Primary `#FF6B9D` / Background `#FAF8F5` / Text `#1A1816`
- アクセント: Turquoise `#4ECDC4` / Purple `#9B59B6`
- フォント: Playfair Display (見出し) / Noto Serif JP (本文) / Noto Sans JP (UI)
- アニメーション: CSS-only (framer-motion 不使用、バンドルサイズ最適化済み)

---

## 2. URL 構造 & ルーティング

```
/                              → ホーム (Hero + Pick Up 記事6件)
/blog                          → ブログ一覧 (フィルター + 無限スクロール)
/blog?category=gourmet         → カテゴリフィルター
/blog?hashtags=tag1,tag2       → ハッシュタグフィルター
/blog?sort=popular             → 人気順ソート
/gourmet/                      → カテゴリ一覧ページ
/gourmet/[slug]/               → 記事詳細
/search?q=keyword              → 検索結果
/chat                          → AI Chat (管理者: フルチャット / 一般: ティーザー)
/about                         → About (プロフィール + 得意分野 + CTA)
/privacy                       → プライバシーポリシー
/admin/                        → 管理パネル
/admin/posts                   → 記事管理
/admin/categories              → カテゴリ管理
/admin/hashtags                → ハッシュタグ管理
/admin/media                   → メディア管理
/admin/ai/knowledge            → AI ナレッジ管理
/admin/ai/tags                 → AI プロンプトタグ管理
/admin/ai/analytics            → AI 利用統計
```

**カテゴリ** (フラット構造): gourmet, event, spot, culture, news

---

## 3. ページ詳細

### 3.1 ホーム (`/`)

- **レンダリング**: ISR (revalidate: 600秒 = 10分)
- **データ取得**: `getPickupPosts()` — おすすめ記事 (is_featured=true) 優先、なければ最新6件
- **構成**: HeroSection (CSS アニメーション付きヒーロー) + PostCard グリッド (3列) + ブログ CTA リンク
- **SEO**: トップレベル metadata (SITE_CONFIG)

### 3.2 ブログ一覧 (`/blog`)

- **レンダリング**: force-dynamic (searchParams 使用)
- **データ取得**: `Promise.all([getCategories(), getPopularHashtags(), getInitialPosts()])` — 3並列フェッチ
- **フィルター**: category (slug), hashtags (カンマ区切り), sort (latest/popular/title)
- **ページネーション**: クライアントサイド InfinitePostGrid ("もっと見る"ボタン、6件ずつ)
- **構成**: FilterBar + Suspense(InfinitePostGrid) + PopularHashtags
- **API**: 追加読み込みは `GET /api/posts?page=N&limit=6&...`

### 3.3 カテゴリ一覧 (`/[category]`)

- **レンダリング**: force-dynamic
- **データ取得**: `getCategory(slug)` (React.cache でリクエスト重複排除) + `getCategoryPosts()`
- **メタデータ**: `generateMetadata()` でカテゴリ名 + 説明を動的生成
- **構成**: カテゴリヘッダー + Suspense(InfinitePostGrid) + PopularHashtags
- **404**: カテゴリが存在しない場合 `notFound()`

### 3.4 記事詳細 (`/[category]/[slug]`)

- **レンダリング**: ISR (revalidate: 3600秒 = 1時間)
- **事前生成**: `generateStaticParams()` で人気上位30記事を事前ビルド
- **データ取得**: `getPost(slug)` (React.cache でメタデータとページ間の重複排除)
- **構成**:
  - JSON-LD (Article + Breadcrumb スキーマ)
  - ViewCounter (閲覧数インクリメント、StrictMode 対応)
  - ScrollProgress (スクロール進捗バー)
  - ImageLightbox (画像拡大ダイアログ)
  - Breadcrumbs → ArticleHero → TableOfContents (モバイル/デスクトップ) → ArticleBody → ArticleMeta → ReactionBar → RelatedArticles
- **TOC**: デスクトップは `xl:block fixed` で右サイドに固定、モバイルは折りたたみ

### 3.5 検索 (`/search`)

- **レンダリング**: force-dynamic
- **データ取得**: `searchPosts()` — `search_posts` RPC を2回呼び出し (ページデータ + カウント) を `Promise.all` で並列化
- **ページネーション**: サーバーサイド Pagination コンポーネント (12件/ページ)
- **SEO**: `robots: { index: false, follow: true }` (検索結果ページはインデックス除外)

### 3.6 AI Chat (`/chat`)

- **レンダリング**: force-dynamic
- **認証分岐**:
  - 管理者 (`admin_auth` cookie): ChatPage を `next/dynamic` で動的読み込み + プロンプトタグ12件
  - 一般ユーザー: ティーザー画面 ("Coming Soon" + ブログ CTA)
- **ChatPage**: SSE ストリーミング、メッセージ管理、セッション管理 (localStorage)

### 3.7 About (`/about`)

- **レンダリング**: 完全静的 (DB 依存なし)
- **構成**: プロフィール画像 + 自己紹介文 + 6つの得意分野カード + Instagram DM CTA

### 3.8 プライバシーポリシー (`/privacy`)

- **レンダリング**: 完全静的
- **構成**: 法的文書 (GA、Cookie、著作権、免責事項)

### 3.9 404 ページ

- **構成**: 大きな "404" + メッセージ + ホームリンク

---

## 4. レイアウト構造

### Root Layout (`src/app/layout.tsx`)
- Google Fonts ロード (Playfair Display, Noto Serif JP, Noto Sans JP)
- グローバル metadata (OG, Twitter Card, robots, favicon)
- viewport 設定 (device-width, maximumScale: 5)
- GoogleAnalytics (afterInteractive)
- JSON-LD (WebSite + Organization スキーマ)

### Public Layout (`src/app/(public)/layout.tsx`)
- Header → `<main className="min-h-screen">` → Footer

### Admin Layout (`src/app/(admin)/admin/layout.tsx`)
- robots: noindex, nofollow
- Sidebar (固定 256px) + Header (固定 64px) + main (ml-64 pt-16)
- ToastProvider

### Chat Layout (`src/app/(chat)/layout.tsx`)
- ChatHeader (h-14) + main (h-[calc(100dvh-56px)])

---

## 5. コンポーネント一覧

### 5.1 パブリックコンポーネント

| コンポーネント | 種別 | 説明 |
|--------------|------|------|
| Header | Client | スティッキーヘッダー、スクロール検知、モバイルメニュー、SearchBar |
| Footer | Server | 3カラムフッター (ブランド/サイトマップ/SNS)、CSS アニメーション |
| HeroSection | Client | ヒーローセクション、装飾 SVG、スクロールボタン |
| PostCard | Server | 記事カード (サムネイル/カテゴリバッジ/タイトル/抜粋/ハッシュタグ/メタ) |
| InfinitePostGrid | Client | "もっと見る" 無限スクロール (6件ずつ /api/posts) |
| PostGrid | Server | 検索結果用グリッド |
| FilterBar | Client | カテゴリ/ソート/ハッシュタグフィルター (useTransition) |
| CategorySelect | Client | カテゴリドロップダウン |
| SortSelect | Client | ソート順ドロップダウン |
| HashtagInput | Client | ハッシュタグ入力 (オートコンプリート) |
| SearchBar | Client | デバウンス検索 (300ms) + サジェストドロップダウン |
| PopularHashtags | Server | タグクラウド (上位30件、フォントサイズ可変) |
| CategoryBadge | Server | カテゴリバッジ (グラデーション背景) |
| HashtagList | Server | ハッシュタグリスト (#付きリンク) |
| HashtagLink | Client | 個別ハッシュタグリンク |
| ArticleHero | Server | 記事ヒーロー (タイトル/サムネイル/カテゴリ/日付/閲覧数) |
| ArticleBody | Server | 記事本文 (HTML レンダリング、prose スタイル) |
| ArticleMeta | Server | 記事メタ情報 (カテゴリ/ハッシュタグ/日付/閲覧数) |
| Breadcrumbs | Server | パンくずリスト |
| TableOfContents | Client | 目次 (IntersectionObserver + PC 固定/モバイル折りたたみ) |
| RelatedArticles | Server | 関連記事 (スコアリング: カテゴリ +10, ハッシュタグ +3) |
| ReactionBar | Client | 4種リアクション (localStorage + Optimistic Update + RPC) |
| ViewCounter | Client | 閲覧数カウンター (module-level Set で StrictMode 対応) |
| ScrollProgress | Client | スクロール進捗バー (requestAnimationFrame + passive scroll) |
| ScrollFadeIn | Client | スクロール表示アニメーション (IntersectionObserver) |
| ImageLightbox | Client | 画像拡大 (native `<dialog>`) |
| GoogleAnalytics | Client | GA4 (Script strategy="afterInteractive") |
| Pagination | Client | サーバーサイドページネーション (searchParams 連携) |

### 5.2 AI チャットコンポーネント

| コンポーネント | 種別 | 説明 |
|--------------|------|------|
| ChatPage | Client (dynamic import) | メインチャット (SSE ストリーミング、セッション管理、メッセージ状態) |
| ChatHeader | Client | チャットヘッダー (ロゴ + ブログリンク) |
| ChatInput | Client | 入力エリア (オートリサイズ、500文字制限、Enter 送信) |
| ChatMessages | Client | メッセージリスト (自動スクロール、aria-live) |
| ChatMessage | Client (memo) | 個別メッセージ (ユーザー/アシスタント分岐、ReactMarkdown、アタッチメント) |
| ChatArticleCard | Client | 記事カード (サムネイル + タイトル + 抜粋) |
| ChatSpotCard | Client | スポットカード (場所情報) |
| ChatSuggestions | Client | 提案チップス |
| ChatTagList | Client | プロンプトタグ (purpose/area/scene カラー分け) |
| WelcomeScreen | Server | ウェルカム画面 ("何を知りたいですか？") |

### 5.3 管理パネルコンポーネント

| コンポーネント | 種別 | 説明 |
|--------------|------|------|
| Sidebar | Client | 固定サイドバー (メイン5項目 + AI管理3項目) |
| Header | Client | 管理ヘッダー (ログアウトボタン) |
| ImageUploader | Client | 画像アップロード (D&D、5MB上限、Storage 連携) |
| MediaPickerDialog | Client | メディアライブラリ選択 (React Portal) |
| RichTextEditor | Server→Client | Tiptap エディタ (dynamic import, SSR-safe) |
| RichTextEditorClient | Client | Tiptap 本体 (ツールバー、バブルメニュー、フローティングメニュー) |
| CustomBubbleMenu | Client | テキスト選択時のコンテキストメニュー (Portal + Floating UI) |
| CustomFloatingMenu | Client | 空行時のブロックコマンドメニュー |
| EditorImagePicker | Client | エディタ内画像挿入 |
| EditorLinkDialog | Client | リンク挿入ダイアログ |
| FigureExtension | - | Tiptap カスタム拡張 (`<figure>` + `<figcaption>`) |
| BoxExtension | - | Tiptap カスタム拡張 (装飾ボックス) |

### 5.4 UI 基盤コンポーネント (`src/components/ui/`)

Button, Card, Badge, Input, Textarea, Label, Select, Checkbox, Dialog, Table, Toast (ToastProvider)

---

## 6. API ルート

### 6.1 パブリック API

| エンドポイント | メソッド | 認証 | 説明 |
|--------------|---------|------|------|
| `/api/posts` | GET | なし | 記事一覧 (ページネーション + フィルター) |
| `/api/posts/[slug]/view` | POST | なし | 閲覧数インクリメント (RPC) |
| `/api/search/suggest` | GET | なし | 検索サジェスト (記事5件 + タグ5件) |
| `/api/reactions` | GET | なし | リアクションカウント取得 |
| `/api/reactions` | POST | なし (RPC) | リアクション追加 (increment_reaction_count) |
| `/api/reactions` | DELETE | なし (RPC) | リアクション削除 (decrement_reaction_count) |
| `/api/ai/tags` | GET | なし | アクティブなプロンプトタグ (上位12件) |
| `/api/keepalive` | GET | トークン | ヘルスチェック |

### 6.2 AI API

| エンドポイント | メソッド | 認証 | 説明 |
|--------------|---------|------|------|
| `/api/ai/chat` | POST | セッション制限 | AI チャット (SSE ストリーミング、maxDuration: 30s) |

**チャットフロー**:
1. リクエスト検証 (message, session_id, history)
2. 利用制限チェック (`check_usage_limit` RPC)
3. Gemini で埋め込みベクトル生成
4. ベクトル検索 (`match_articles` RPC, cosine similarity, threshold: 0.5, top 5)
5. コンテキスト構築 + Gemini ストリーミング応答
6. ポスト処理: 記事カード抽出 ([[slug]]), スポット抽出 ({{spot:name}}), サジェスト取得
7. 利用ログ記録 (`log_ai_usage` RPC)

**SSE イベント**: meta → text (チャンク) → articles → spots → suggestions → done / error

### 6.3 管理 API

| エンドポイント | メソッド | 認証 | 説明 |
|--------------|---------|------|------|
| `/api/admin/login` | POST | パスワード | ログイン (cookie 設定: 7日間) |
| `/api/admin/logout` | POST | なし | ログアウト (cookie クリア) |
| `/api/admin/media` | GET | cookie | メディアファイル一覧 |
| `/api/admin/ai/knowledge/generate` | POST | cookie | ナレッジ一括生成 (SSE) |
| `/api/admin/ai/tags/generate` | POST | cookie | AI タグ自動生成 |

---

## 7. データベーススキーマ

### 7.1 テーブル一覧

| テーブル | 行数 | RLS | 主な用途 |
|---------|------|-----|---------|
| posts | 96 | 有効 | ブログ記事 |
| categories | 5 | 有効 | カテゴリ (フラット) |
| post_categories | 96 | 有効 | 記事-カテゴリ中間テーブル |
| hashtags | 26 | 有効 | ハッシュタグ |
| post_hashtags | 96 | 有効 | 記事-ハッシュタグ中間テーブル |
| reactions | 4 | 有効 | リアクション (4種) |
| article_knowledge | 27 | 有効 | AI ナレッジ (埋め込み付き) |
| ai_prompt_tags | 14 | 有効 | AI プロンプトタグ |
| ai_usage_logs | 15 | 有効 | AI 利用ログ |
| ai_usage_limits | 2 | 有効 | AI 利用制限 |

### 7.2 posts テーブル

| カラム | 型 | 制約 | 説明 |
|--------|------|------|------|
| id | uuid | PK, default gen_random_uuid() | |
| title | text | NOT NULL | 記事タイトル |
| slug | text | UNIQUE | URL スラッグ |
| content | text | NOT NULL | HTML 本文 |
| excerpt | text | nullable | 抜粋 |
| thumbnail_url | text | nullable | サムネイル URL |
| view_count | integer | default 0 | 閲覧数 |
| is_published | boolean | default false | 公開状態 |
| is_featured | boolean | default false | おすすめ記事 |
| published_at | timestamptz | nullable | 公開日時 |
| created_at | timestamptz | default now() | 作成日時 |
| updated_at | timestamptz | default now() | 更新日時 |
| search_vector | tsvector | GENERATED ALWAYS STORED | 全文検索用 (title:A, excerpt:B, content:C) |

### 7.3 categories テーブル

| カラム | 型 | 制約 | 説明 |
|--------|------|------|------|
| id | uuid | PK | |
| name | text | NOT NULL | カテゴリ名 |
| slug | text | UNIQUE | URL スラッグ |
| parent_id | uuid | FK → categories.id (SET NULL) | 親カテゴリ (未使用) |
| order_num | integer | default 0 | 表示順 |
| description | text | nullable | 説明文 |
| image_url | text | nullable | カテゴリ画像 |
| meta_title | text | nullable | SEO タイトル |
| meta_description | text | nullable | SEO 説明 |
| is_active | boolean | default true | 有効状態 |

### 7.4 reactions テーブル

| カラム | 型 | 制約 | 説明 |
|--------|------|------|------|
| id | uuid | PK | |
| post_id | uuid | FK → posts.id (CASCADE) | |
| reaction_type | text | CHECK (light/heart/thumbs/fire) | リアクション種別 |
| count | integer | default 0 | カウント |
| UNIQUE | | (post_id, reaction_type) | 複合ユニーク |

### 7.5 article_knowledge テーブル

| カラム | 型 | 制約 | 説明 |
|--------|------|------|------|
| id | uuid | PK | |
| post_id | uuid | FK → posts.id (CASCADE), UNIQUE | 1記事1ナレッジ |
| slug | text | | 記事スラッグ |
| metadata | jsonb | default '{}' | KnowledgeMetadata (title, category, hashtags, area, summary, keywords, spots) |
| content | text | default '' | マークダウンコンテンツ |
| embedding | vector(768) | nullable | Gemini 埋め込みベクトル |
| is_active | boolean | default true | |

### 7.6 ai_usage_logs テーブル

| カラム | 型 | 説明 |
|--------|------|------|
| id | uuid | PK |
| session_id | text | セッション ID |
| query | text | ユーザーの質問 |
| token_input | integer | 入力トークン数 |
| token_output | integer | 出力トークン数 |
| matched_articles | jsonb | マッチした記事スラッグ |
| created_at | timestamptz | |

### 7.7 ai_usage_limits テーブル

| カラム | 型 | 説明 |
|--------|------|------|
| id | uuid | PK |
| limit_type | text | CHECK (daily_user/monthly_site) |
| limit_value | integer | 上限値 |
| current_value | integer | 現在値 |
| reset_at | timestamptz | リセット日時 |

### 7.8 外部キー & CASCADE

| テーブル | カラム | 参照先 | ON DELETE |
|---------|--------|--------|----------|
| post_categories | post_id | posts.id | CASCADE |
| post_categories | category_id | categories.id | CASCADE |
| post_hashtags | post_id | posts.id | CASCADE |
| post_hashtags | hashtag_id | hashtags.id | CASCADE |
| reactions | post_id | posts.id | CASCADE |
| article_knowledge | post_id | posts.id | CASCADE |
| categories | parent_id | categories.id | SET NULL |

---

## 8. インデックス戦略

### 複合インデックス
- `idx_posts_published_composite` — `(is_published, published_at DESC)` — 最も頻繁なクエリパターン

### 部分インデックス (WHERE is_published = true)
- `idx_posts_published_at_partial` — `(published_at DESC)`
- `idx_posts_view_count_partial` — `(view_count DESC)`
- `idx_posts_slug_partial` — `(slug)`

### 全文検索 (GIN)
- `idx_posts_search_vector` — `(search_vector)` tsvector
- `idx_posts_title_trgm` — `(title)` gin_trgm_ops
- `idx_posts_excerpt_trgm` — `(excerpt)` gin_trgm_ops

### FK インデックス
- `idx_post_categories_post_id`, `idx_post_categories_category_id`
- `idx_post_hashtags_post_id`, `idx_post_hashtags_hashtag_id`
- `idx_reactions_post_id`

### その他
- `idx_posts_is_published`, `idx_posts_published_at`, `idx_posts_view_count`
- `idx_aul_created_at` (DESC), `idx_aul_session_id`
- `idx_apt_order_num`, `idx_apt_tag_type`
- `idx_ak_is_active`, `idx_ak_slug`

---

## 9. RLS (Row Level Security) ポリシー

全10テーブルで RLS 有効。`auth.role()` は `(select auth.role())` でサブクエリラップ済み (パフォーマンス最適化)。

### 公開テーブル (匿名 SELECT 許可)
- **posts**: `is_published = true` のみ閲覧可
- **categories**: `is_active = true` のみ閲覧可
- **hashtags**: 全件閲覧可
- **post_categories / post_hashtags**: 全件閲覧可
- **reactions**: 全件閲覧可 (INSERT/UPDATE は RPC 経由のみ)
- **ai_prompt_tags**: `is_active = true` のみ閲覧可
- **ai_usage_limits**: 全件閲覧可
- **article_knowledge**: `is_active = true` のみ閲覧可

### 認証ユーザー (ALL 操作許可)
- 全テーブルに `(select auth.role()) = 'authenticated'` ポリシー

### reactions のセキュリティ
- 匿名ユーザーは SELECT のみ (カウント取得)
- INSERT/UPDATE は `SECURITY DEFINER` RPC 経由のみ (`increment_reaction_count`, `decrement_reaction_count`)

---

## 10. RPC 関数一覧

| 関数名 | 引数 | 戻り値 | SECURITY | 揮発性 | 用途 |
|--------|------|--------|----------|--------|------|
| `increment_post_view_count` | (post_slug) | integer | DEFINER | VOLATILE | 閲覧数 +1 |
| `increment_reaction_count` | (post_id, type) | integer | DEFINER | VOLATILE | リアクション +1 (UPSERT) |
| `decrement_reaction_count` | (post_id, type) | integer | DEFINER | VOLATILE | リアクション -1 |
| `search_posts` | (query, limit, offset) | TABLE | - | STABLE | 全文検索 (trigram + tsvector) |
| `search_suggestions` | (query) | TABLE | - | STABLE | 検索サジェスト (top 5) |
| `match_articles` | (embedding, threshold, count) | TABLE | - | VOLATILE | ベクトル類似検索 |
| `check_usage_limit` | (session_id) | jsonb | DEFINER | VOLATILE | 利用制限チェック |
| `log_ai_usage` | (session_id, query, ...) | void | DEFINER | VOLATILE | 利用ログ記録 |
| `get_today_usage_stats` | () | TABLE | DEFINER | STABLE | 今日の統計 |
| `get_monthly_usage_stats` | () | TABLE | DEFINER | STABLE | 今月の統計 |
| `get_daily_usage_breakdown` | () | TABLE | DEFINER | STABLE | 日別集計 |
| `get_top_queries` | (limit) | TABLE | DEFINER | STABLE | TOP N クエリ |
| `update_hashtag_count` | () | trigger | - | VOLATILE | ハッシュタグ数自動更新 |
| `update_updated_at_column` | () | trigger | - | VOLATILE | updated_at 自動更新 |
| `list_storage_objects` | (bucket_name) | TABLE | DEFINER | VOLATILE | Storage オブジェクト一覧 |

---

## 11. ユーティリティライブラリ

| ファイル | エクスポート | 用途 |
|---------|------------|------|
| `lib/site-config.ts` | `SITE_CONFIG` | サイト名, URL, 著者情報, キーワード |
| `lib/types.ts` | 全インターフェース | Post, Category, Hashtag, PostWithRelations, AI types |
| `lib/utils.ts` | `cn()` | Tailwind クラス結合 (clsx + tailwind-merge) |
| `lib/supabase.ts` | 3クライアント | createClient, createServerClient, createAdminClient |
| `lib/supabase-browser.ts` | `getSupabaseBrowser()` | ブラウザ用シングルトン |
| `lib/seo-utils.ts` | 3関数 | truncateDescription, generateCanonicalUrl, extractKeywords |
| `lib/structured-data.tsx` | 4スキーマ + JsonLd | Article, Breadcrumb, Organization, WebSite |
| `lib/article-utils.ts` | `processArticleContent()` | HTML 見出し抽出 + ID 付与 (TOC 用) |
| `lib/view-counter.ts` | `incrementViewCount()` | 閲覧数 API 呼び出し |
| `lib/pagination-utils.ts` | 4関数 | ページネーション計算 |
| `lib/hashtag-utils.ts` | 2関数 | タグクラウドサイズ計算 |
| `lib/filter-utils.ts` | FilterState + 5関数 | URL ↔ フィルター状態変換 |
| `lib/category-colors.ts` | 2関数 | カテゴリグラデーション取得 |
| `lib/gemini.ts` | 2モデル | Gemini テキスト + 埋め込みモデル |
| `lib/knowledge-generator.ts` | 3関数 | ナレッジ生成 + 埋め込み生成 |
| `lib/ai-prompt.ts` | システムプロンプト + 1関数 | FUNE ペルソナ + コンテキスト構築 |
| `lib/ai-chat.ts` | 検証 + 後処理 | リクエスト検証, スラッグ/スポット抽出, データ取得 |
| `lib/ai-chat-client.ts` | `streamChat()` | SSE クライアント (async generator) |
| `hooks/useDebounce.ts` | `useDebounce<T>()` | 値のデバウンス (default 300ms) |

---

## 12. CSS アニメーションシステム

### Tailwind アニメーション (tailwind.config.ts)
- `animate-fade-in` — opacity 0→1, 0.3s, both
- `animate-slide-in` — translateY(10px)→0 + opacity, 0.3s, both
- `animate-slide-in-up` — translateY(20px)→0 + opacity, 0.5s, both
- `animate-slide-in-left` — translateX(-20px)→0 + opacity, 0.3s, both

### globals.css アニメーション
- `animate-fade-in-up` — translateY(20px)→0 + opacity, 0.4s, fill-mode both

### Stagger ユーティリティ (globals.css)
- `.stagger-1` ~ `.stagger-8` — animation-delay 100ms ~ 800ms

### 使用パターン
```html
<h1 class="animate-slide-in-up stagger-3">タイトル</h1>
<p class="animate-slide-in-up stagger-4">サブタイトル</p>
```

---

## 13. SEO 対策

- **メタデータ**: 全ページに title, description, OG, Twitter Card
- **構造化データ**: Article, Breadcrumb, WebSite, Organization (JSON-LD)
- **サイトマップ**: 動的生成 (全公開記事 + カテゴリ)
- **robots.txt**: `/api/` と `/admin/` を除外
- **canonical URL**: 全ページに設定
- **ISR**: 記事ページ 1時間、ホーム 10分
- **静的生成**: About, Privacy, 404

---

## 14. 認証 & セキュリティ

- **管理者認証**: パスワードベース (cookie: `admin_auth`, httpOnly, 7日間)
- **ミドルウェア**: `/admin/*` ルートを保護 (`src/middleware.ts`)
- **RLS**: 全テーブルで有効、公開データは `is_published`/`is_active` でフィルター
- **SECURITY DEFINER**: リアクション操作、閲覧数更新、AI 利用管理
- **AI 利用制限**: セッションベース日次制限 + サイト月次制限

---

## 15. 環境変数

| 変数 | 必須 | 説明 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | 必須 | Supabase プロジェクト URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 必須 | Supabase Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | 必須 | Service Role Key (サーバーのみ) |
| `NEXT_PUBLIC_SITE_URL` | 必須 | サイト URL |
| `ADMIN_PASSWORD` | 必須 | 管理者パスワード |
| `GEMINI_API_KEY` | 必須 | Gemini API キー |
| `GEMINI_MODEL` | 任意 | テキストモデル (default: gemini-3-flash-preview) |
| `EMBEDDING_MODEL` | 任意 | 埋め込みモデル (default: gemini-embedding-001) |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | 任意 | GA4 測定 ID |

---

## 16. パフォーマンス最適化 (実施済み)

### Next.js ベストプラクティス準拠 (2026-04-03)
- framer-motion 完全除去 → CSS-only アニメーション (バンドル -50KB+)
- React.cache() によるリクエスト重複排除 (category, article ページ)
- ホームページ ISR 化 (force-dynamic → revalidate: 600)
- ChatPage の next/dynamic 動的インポート
- 検索ページの Promise.all 並列化
- Footer / WelcomeScreen の Server Component 化
- revalidate + force-dynamic 矛盾解消

### Supabase Postgres ベストプラクティス準拠 (2026-04-03)
- RLS ポリシーの auth.role() サブクエリラップ (5-10x 高速化)
- reactions テーブルのセキュリティ強化 (直接変更禁止)
- 複合インデックス (is_published, published_at DESC)
- 部分インデックス3件 (published posts のみ)
- 重複インデックス5件削除
- Analytics 関数の STABLE マーキング

---

## 17. 管理パネル機能

### ダッシュボード (`/admin`)
- 統計カード: 総記事数, 総閲覧数, カテゴリ数, ハッシュタグ数
- 最近の記事5件、人気記事5件
- カテゴリ別記事数

### 記事管理 (`/admin/posts`)
- CRUD (作成/編集/削除)
- Tiptap リッチテキストエディタ (見出し、リスト、画像、リンク、Figure、Box)
- カテゴリ選択 (複数可)
- ハッシュタグ入力
- サムネイル画像アップロード (D&D / ライブラリ選択)
- 公開/下書き切り替え
- おすすめ記事フラグ
- 手動削除時は CASCADE で関連データ自動削除

### カテゴリ管理 (`/admin/categories`)
- CRUD、表示順設定、SEO メタデータ

### ハッシュタグ管理 (`/admin/hashtags`)
- CRUD、カウント表示

### メディア管理 (`/admin/media`)
- ファイル一覧 (Supabase Storage)
- 使用状況チェック (サムネイル + 記事本文)
- 単体/一括削除 (使用中の場合は警告)

### AI ナレッジ管理 (`/admin/ai/knowledge`)
- CRUD
- 一括 Gemini 生成 (SSE ストリーミング、リトライ、指数バックオフ)
- 埋め込みのみ再生成
- 記事ごとの AI 再生成ボタン

### AI タグ管理 (`/admin/ai/tags`)
- CRUD (purpose/area/scene タイプ)
- Gemini による自動生成

### AI 統計 (`/admin/ai/analytics`)
- 今日/今月の統計カード (質問数, トークン, セッション数)
- 日別利用グラフ (CSS バーチャート)
- TOP 10 クエリ
- 日次/月次制限値の管理フォーム

---

## 18. Supabase プロジェクト情報

- **プロジェクト名**: sayo-blog
- **プロジェクト ID**: nkvohswifpmarobyrnbe
- **リージョン**: ap-northeast-1 (東京)
- **Storage バケット**: thumbnails (public)
- **拡張機能**: pg_trgm, pgvector
