# SPEC-FULL.md — Sayo's Journal 完全仕様書

**プロジェクト名**: Sayo's Journal
**URL**: https://www.sayo-kotoba.com
**作成日**: 2026-04-03
**最終更新**: 2026-06-21（Phase 3 Instagram連携 + Phase 4 情報窓口フォーム + AI Chat UI 改善を反映）
**ステータス**: Phase 1 + Phase 2 + Phase 4 完了 / Phase 3 (29-32, 37 done; 33 保留; 34-36 廃止; 38-39 pending)

> この仕様書は「現在の実装」を反映する。チケット単位の詳細進捗は
> `.claude/rules/implementation-status.md`、領域別ルールは `.claude/rules/*.md` を参照。

---

## 1. プロジェクト概要

ライター・インタビュアー本岡紗代のナラティブブログサイト。「言葉 × 写真 × 体験」を融合し、南信州（飯田・下伊那）の人・場所・記憶を発信する。

Phase 4 では「3 つの記事のかたち（自由記事 / ミニ記事 / ロング記事）」を支える**情報窓口フォーム**を追加し、地域の人が情報を寄せ、紗代さんが記事化する流れを実装した。

### 技術スタック

| 技術 | バージョン | 用途 |
|------|-----------|------|
| Next.js | 15.5.7 | App Router フレームワーク |
| React | 19.1.0 | UI ライブラリ |
| TypeScript | 5 | 型安全性 |
| Tailwind CSS | 3.4.17 | スタイリング |
| Supabase | 2.81.1 | PostgreSQL + pgvector + Storage |
| Google Gemini | 0.24.1 | AI 生成 (gemini-3-flash-preview) + 埋め込み (gemini-embedding-2-preview, 3072次元) |
| Tiptap | 3.14.0 | リッチテキストエディタ (Admin) |
| Nodemailer | 8.x | Gmail SMTP で情報窓口の通知メール送信 |
| Zod | 4.x | 公開フォームの入力バリデーション |
| Vercel BotID (botid) | 1.x | 公開フォームのボット対策 |
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
# 公開ページ
/                              → ホーム (Hero + Pick Up 記事6件)
/blog                          → ブログ一覧 (フィルター + "もっと見る")
/blog?category=gourmet         → カテゴリフィルター
/blog?hashtags=tag1,tag2       → ハッシュタグフィルター
/blog?sort=popular             → 人気順ソート
/gourmet/                      → カテゴリ一覧ページ
/gourmet/[slug]/               → 記事詳細 (ArticleTypeBadge: ミニ/取材を表示)
/search?q=keyword              → 検索結果
/about                         → About (FUNE プロフィール + 3つの記事のかたち + 情報窓口 CTA)
/privacy                       → プライバシーポリシー

# AI Chat ((chat) ルートグループ)
/chat                          → AI Chat (管理者: フルチャット / 一般: ティーザー)

# 情報窓口フォーム (Phase 4)
/request/mini                  → ミニ記事の情報提供フォーム (BotID + Zod + Gmail SMTP 通知)
/request/mini/thanks           → ミニ記事 送信完了画面 (noindex)
/request/long                  → 取材依頼フォーム (種別ごと条件出し分け + BotID + Gmail SMTP 通知)
/request/long/thanks           → ロング記事 送信完了画面 (noindex)

# 管理パネル
/admin/                        → ダッシュボード
/admin/posts                   → 記事管理 (出自タブ: 自由/ミニ/ロング)
/admin/posts/new               → 記事新規作成 (?from_inquiry=long&id=... で取材依頼紐付け)
/admin/posts/[id]              → 記事編集 (本文 + イベント情報 + 公開設定 + IG セクション)
/admin/posts/[id]/preview      → 下書きプレビュー (chromeless)
/admin/categories              → カテゴリ管理
/admin/hashtags                → ハッシュタグ管理
/admin/media                   → メディア管理 (thumbnails バケット)
/admin/inquiries               → 依頼管理 (ミニ/ロングのタブ + 件数バッジ + 詳細/ステータス/削除)
/admin/inquiries/[id]/generate → ミニ記事の AI 記事化
/admin/instagram/posts         → IG 下書き管理 (セクション選択式生成 + 編集)
/admin/ai/knowledge            → AI ナレッジ管理
/admin/ai/tags                 → AI プロンプトタグ管理
/admin/ai/analytics            → AI 利用統計
```

**カテゴリ** (フラット構造, 5件): gourmet, event, spot, culture, news

---

## 3. ページ詳細

### 3.1 ホーム (`/`)
- **レンダリング**: ISR (revalidate: 600秒 = 10分)
- **データ取得**: `getPickupPosts()` — おすすめ記事 (is_featured=true) 優先、なければ最新6件
- **構成**: HeroSection + PostCard グリッド (3列) + ブログ CTA リンク

### 3.2 ブログ一覧 (`/blog`)
- **レンダリング**: force-dynamic (searchParams 使用)
- **データ取得**: `Promise.all([getCategories(), getPopularHashtags(), getInitialPosts()])`
- **フィルター**: category / hashtags (カンマ区切り) / sort (latest/popular/title)
- **ページネーション**: InfinitePostGrid ("もっと見る"ボタン、6件ずつ `GET /api/posts`)

### 3.3 カテゴリ一覧 (`/[category]`)
- **レンダリング**: force-dynamic
- **データ取得**: `getCategory(slug)` (React.cache) + `getCategoryPosts()`
- **404**: カテゴリが存在しない場合 `notFound()`

### 3.4 記事詳細 (`/[category]/[slug]`)
- **レンダリング**: ISR (revalidate: 3600秒 = 1時間)
- **事前生成**: `generateStaticParams()` で人気上位30記事
- **データ取得**: `getPost(slug)` (React.cache)
- **構成**: JSON-LD → ViewCounter → ScrollProgress → ImageLightbox → Breadcrumbs → **ArticleTypeBadge** → ArticleHero (event_ended なら EventEndedOverlay) → TableOfContents → ArticleBody → ArticleMeta → ReactionBar → RelatedArticles
- **ArticleTypeBadge**: `article_type` が mini なら「📩 ミニ記事」、long なら「✍️ 取材記事」、free は非表示

### 3.5 検索 (`/search`)
- **レンダリング**: force-dynamic
- **データ取得**: `search_posts` RPC を2回 (データ + カウント) `Promise.all`
- **SEO**: `robots: { index: false, follow: true }`

### 3.6 AI Chat (`/chat`) — (chat) ルートグループ
- **レンダリング**: force-dynamic
- **認証分岐**: 管理者 (`admin_auth` cookie) はフルチャット (ChatPage を `next/dynamic`)、一般はティーザー
- **ChatPage**: SSE ストリーミング + クライアント側タイプライタ + セッション管理 (localStorage)
- レイアウトの詳細は §4・§21 を参照

### 3.7 About (`/about`)
- **レンダリング**: 静的
- **構成**: FUNE プロフィール + 6つの得意分野 + 「3 つの記事のかたち」セクション + /request/mini・/request/long CTA + Instagram DM CTA

### 3.8 情報窓口フォーム (`/request/mini`, `/request/long`)
- **レンダリング**: 静的 (Server Component) + Client フォーム
- **ミニ記事** (`/request/mini`): SNS URL 1〜5 + 種別 + 連絡先 + 公開希望 + 画像最大2枚 + 同意
- **ロング記事** (`/request/long`): 種別 (個人/組織/団体) で必須項目を出し分け + 取材内容 200〜2000字 + 連絡先 + 同意（画像なし）
- 送信フローは §19 を参照。完了画面 (`/request/*/thanks`) は noindex

### 3.9 プライバシーポリシー (`/privacy`) / 404
- 完全静的

---

## 4. レイアウト構造

### Root Layout (`src/app/layout.tsx`)
- Google Fonts ロード / グローバル metadata (OG, Twitter Card, robots, favicon) / viewport / GoogleAnalytics / JSON-LD (WebSite + Organization)

### Public Layout (`src/app/(public)/layout.tsx`)
- Header → `<main className="min-h-screen">` → Footer

### Chat Layout (`src/app/(chat)/layout.tsx`)
- 公開 Header + `<main className="h-[calc(100dvh-4rem)] md:h-[calc(100dvh-5rem)] overflow-hidden">`（Footer 無し）
- (public) の `min-h-screen + Footer` による body 余剰スクロール（二重スクロールバー）を構造的に回避するための専用レイアウト
- `ChatHeader.tsx` は現在不使用（公開 Header を使うようになったため残置）

### Admin Layout (`src/app/(admin)/admin/layout.tsx`)
- robots: noindex, nofollow / Sidebar (256px) + Header (64px) + main (ml-64 pt-16) / ToastProvider
- `CHROMELESS_PATTERNS` に一致するパス (preview 系) は Sidebar/Header をスキップ
- Sidebar に依頼の未処理 (pending) 件数バッジを注入 (`getInquiryCounts`)

---

## 5. コンポーネント一覧

### 5.1 パブリックコンポーネント
Header (CTA「情報を届ける/取材を依頼」付き) / Footer / HeroSection / PostCard / InfinitePostGrid / PostGrid / FilterBar / CategorySelect / SortSelect / HashtagInput / SearchBar / PopularHashtags / CategoryBadge / HashtagList / HashtagLink / ArticleHero / ArticleBody / ArticleMeta / Breadcrumbs / TableOfContents / RelatedArticles / ReactionBar / ViewCounter / ScrollProgress / ScrollFadeIn / ImageLightbox / GoogleAnalytics / Pagination
- **ArticleTypeBadge** (Server) — 📩ミニ記事 / ✍️取材記事 (free は描画なし)
- **EventEndedOverlay** (Server) — イベント終了記事のサムネ/ヒーローに白黒 + 終了案内 (mode: card | hero)

### 5.2 情報窓口フォームコンポーネント
- `request/mini/_components/MiniRequestForm.tsx` (Client) — 条件表示 + 画像プレビュー
- `request/long/_components/LongRequestForm.tsx` (Client) — 種別で必須項目を出し分け

### 5.3 AI チャットコンポーネント
ChatPage (Client, dynamic) / ChatInput / ChatMessages / ChatMessage (memo) / ChatArticleCard / ChatSpotCard / ChatSuggestions / ChatTagList / WelcomeScreen
- ChatHeader は現在不使用 (§4 参照)

### 5.4 管理パネルコンポーネント
Sidebar / Header / ImageUploader / MediaPickerDialog / RichTextEditor(+Client) / CustomBubbleMenu / CustomFloatingMenu / EditorImagePicker / EditorLinkDialog / FigureExtension / BoxExtension
- 記事編集: PostForm / PostList (出自タブ) / EventInfoSection / IgPostsSection
- 依頼管理: InquiriesTabs / MiniInquiriesList / MiniInquiryDetailDialog / LongInquiriesList / LongInquiryDetailDialog / GenerateForm
- IG: IgPostsClient / IgPostCard / IgPostEditDialog / GenerateDialog / AutoGenerateSettings

### 5.5 UI 基盤コンポーネント (`src/components/ui/`)
Button, Card, Badge, Input, Textarea, Label, Select, Checkbox, Dialog, Table, Toast (ToastProvider)

---

## 6. API ルート

### 6.1 パブリック API
| エンドポイント | メソッド | 認証 | 説明 |
|--------------|---------|------|------|
| `/api/posts` | GET | なし | 記事一覧 (ページネーション + フィルター) |
| `/api/posts/[slug]/view` | POST | なし | 閲覧数インクリメント (RPC) |
| `/api/search/suggest` | GET | なし | 検索サジェスト (記事5件 + タグ5件) |
| `/api/reactions` | GET/POST/DELETE | なし (RPC) | リアクション取得/追加/削除 |
| `/api/ai/tags` | GET | なし | アクティブなプロンプトタグ (上位12件) |
| `/api/keepalive` | GET | トークン | ヘルスチェック |

> 情報窓口フォームの送信は API ルートではなく **Server Actions** (`submitMiniInquiry` / `submitLongInquiry`) で処理する。

### 6.2 AI API
| エンドポイント | メソッド | 認証 | 説明 |
|--------------|---------|------|------|
| `/api/ai/chat` | POST | セッション制限 | AI チャット (SSE ストリーミング、maxDuration: 30s) |

**チャットフロー**: リクエスト検証 → 利用制限チェック (`check_usage_limit`) → 埋め込み生成 → ベクトル検索 (`match_articles`, threshold 0.5, top5) → コンテキスト構築 + Gemini ストリーミング → ポスト処理 (記事カード `[[slug]]` / スポット `{{spot:name}}` / サジェスト) → 利用ログ (`log_ai_usage`)
**SSE イベント**: meta → text (チャンク) → articles → spots → suggestions → done / error
**レスポンスヘッダ**: `X-Accel-Buffering: no` + `Cache-Control: no-cache, no-transform`（プロキシのバッファ抑制）

### 6.3 管理 API
| エンドポイント | メソッド | 認証 | 説明 |
|--------------|---------|------|------|
| `/api/admin/login` | POST | パスワード | ログイン (cookie 7日間) |
| `/api/admin/logout` | POST | なし | ログアウト |
| `/api/admin/media` | GET | cookie | メディアファイル一覧 |
| `/api/admin/ai/knowledge/generate` | POST | cookie | ナレッジ一括生成 (SSE) |
| `/api/admin/ai/tags/generate` | POST | cookie | AI タグ自動生成 |
| `/api/admin/inquiries/[id]/generate` | POST | cookie | ミニ記事の AI 記事化 (maxDuration: 60s) |
| `/api/admin/instagram/posts` | GET/POST | cookie | IG 下書き 一覧 / 生成 |
| `/api/admin/instagram/posts/[id]` | PATCH/DELETE | cookie | IG 下書き 編集 / 削除 |
| `/api/admin/instagram/generate` | POST | cookie | IG 生成エイリアス |

---

## 7. データベーススキーマ

全14テーブル、すべて RLS 有効。

### 7.1 テーブル一覧
| テーブル | 行数(概算) | 主な用途 |
|---------|------|---------|
| posts | 96 | ブログ記事 |
| categories | 5 | カテゴリ (フラット) |
| post_categories | 96 | 記事-カテゴリ中間 |
| hashtags | 46 | ハッシュタグ |
| post_hashtags | 96 | 記事-ハッシュタグ中間 |
| reactions | 4 | リアクション (4種) |
| article_knowledge | 27 | AI ナレッジ (埋め込み付き) |
| ai_prompt_tags | 14 | AI プロンプトタグ |
| ai_usage_logs | 37 | AI 利用ログ |
| ai_usage_limits | 2 | AI 利用制限 |
| **ig_posts** | 2 | ブログ→IG 投稿下書き (Phase 3) |
| **ig_settings** | 3 | IG 設定 (caption_config / auto_generate 等) |
| **mini_inquiries** | 0 | ミニ記事の情報提供依頼 (Phase 4) |
| **long_inquiries** | 0 | ロング記事 (取材依頼) CRM (Phase 4) |

> Phase 3 で一時導入した `ig_sources` / `ig_imported_posts` は Ticket 40 で廃止・DROP 済み。

### 7.2 posts テーブル
| カラム | 型 | 制約 | 説明 |
|--------|------|------|------|
| id | uuid | PK, gen_random_uuid() | |
| title | text | NOT NULL | タイトル |
| slug | text | UNIQUE | URL スラッグ |
| content | text | NOT NULL | HTML 本文 |
| excerpt | text | nullable | 抜粋 |
| thumbnail_url | text | nullable | サムネイル URL |
| view_count | integer | default 0 | 閲覧数 |
| is_published | boolean | default false | 公開状態 |
| is_featured | boolean | default false | おすすめ記事 |
| published_at | timestamptz | nullable | 公開日時 |
| created_at / updated_at | timestamptz | default now() | |
| search_vector | tsvector | GENERATED STORED | 全文検索 (title:A, excerpt:B, content:C) |
| **event_ended** | boolean | default false | イベント終了表示フラグ |
| **is_event** | boolean | default false | イベント記事フラグ (Ticket 37) |
| **event_date_start / event_date_end** | date | nullable | 開催日 (ISO) |
| **event_time_start / event_time_end** | text | nullable | 時刻 (自由記述) |
| **event_venue / event_address / event_fee / event_url** | text | nullable | 会場/住所/料金/URL |
| **source_urls** | text[] | nullable | ミニ記事の元 SNS URL (内部参照用) |
| **article_type** | text | default 'free', CHECK (free/mini/long) | 記事の出自 |

### 7.3 categories テーブル
id, name, slug(UNIQUE), parent_id(FK self, SET NULL, 未使用), order_num, description, image_url, meta_title, meta_description, is_active(default true), created_at, updated_at

### 7.4 reactions テーブル
id, post_id(FK CASCADE), reaction_type(CHECK light/heart/thumbs/fire), count, UNIQUE(post_id, reaction_type)

### 7.5 article_knowledge テーブル
| カラム | 型 | 説明 |
|--------|------|------|
| id | uuid PK | |
| post_id | uuid FK CASCADE, UNIQUE | 1記事1ナレッジ |
| slug | text | 記事スラッグ |
| metadata | jsonb default '{}' | title/category/hashtags/area/summary/keywords/spots |
| content | text default '' | マークダウン |
| **embedding** | **vector(3072)** nullable | Gemini 埋め込み (gemini-embedding-2-preview) |
| is_active | boolean default true | |

### 7.6 ai_usage_logs / ai_usage_limits
- ai_usage_logs: id, session_id, query, token_input, token_output, matched_articles(jsonb), created_at
- ai_usage_limits: id, limit_type(CHECK daily_user/monthly_site), limit_value, current_value, reset_at

### 7.7 ig_posts テーブル (Phase 3)
id, post_id(FK CASCADE), caption(text), hashtags(text[]), image_url, sequence_number(default 1), status(CHECK draft/published/manual_published), instagram_media_id, instagram_published_at, created_at, updated_at

### 7.8 ig_settings テーブル (Phase 3)
id, setting_key(UNIQUE), setting_value(jsonb), updated_at

### 7.9 mini_inquiries テーブル (Phase 4)
| カラム | 型 | 説明 |
|--------|------|------|
| id | uuid PK | |
| sns_urls | text[] | SNS URL (最大5) |
| inquiry_type | text CHECK(event/shop/group/other) | 種別 |
| inquiry_type_other | text nullable | その他補足 |
| phone | text | 電話番号 (必須) |
| email | text nullable | |
| publish_preference | text CHECK(anytime/by_date/in_month) | 公開希望 |
| publish_target_date | date nullable / publish_target_month | text nullable | 公開希望日/月 |
| image_urls | text[] | 添付画像 (最大2) |
| consent | boolean default false | 同意 |
| status | text CHECK(pending/generating/published/skipped) | ステータス |
| admin_notes | text nullable | 内部メモ |
| generated_post_id | uuid FK posts (SET NULL) | 生成記事 |
| created_at / updated_at | timestamptz | |

### 7.10 long_inquiries テーブル (Phase 4)
| カラム | 型 | 説明 |
|--------|------|------|
| id | uuid PK | |
| client_type | text CHECK(individual/organization/group) | 種別 |
| individual_name / organization_name / department_name / group_name | text nullable | 種別ごとの名称 |
| contact_person | text | 担当者 (必須) |
| address | text | 住所 (必須) |
| interview_content | text | 取材内容 (必須, 200〜2000字) |
| publish_preference / interview_preference | text nullable | 公開/取材希望 (自由記述) |
| phone | text | 電話 (必須) / email nullable |
| consent | boolean default false | 同意 |
| status | text CHECK(pending/contacted/scheduled/interviewed/writing/published/cancelled) | 7段階ステータス |
| admin_notes | text nullable | 内部メモ |
| generated_post_id | uuid FK posts (SET NULL) | 紐付け記事 |
| scheduled_at | timestamptz nullable | 取材日時 |
| fee_amount | integer nullable | 金額 (円) |
| created_at / updated_at | timestamptz | |

### 7.11 外部キー & CASCADE
| テーブル | カラム | 参照先 | ON DELETE |
|---------|--------|--------|----------|
| post_categories / post_hashtags | post_id / *_id | posts / categories / hashtags | CASCADE |
| reactions / article_knowledge | post_id | posts.id | CASCADE |
| ig_posts | post_id | posts.id | CASCADE |
| mini_inquiries / long_inquiries | generated_post_id | posts.id | **SET NULL** |
| categories | parent_id | categories.id | SET NULL |

---

## 8. インデックス戦略

### 複合 / 部分インデックス
- `idx_posts_published_composite` — (is_published, published_at DESC)
- `idx_posts_published_at_partial` / `idx_posts_view_count_partial` / `idx_posts_slug_partial` — WHERE is_published = true
- `idx_posts_event_date_partial` — (event_date_start) WHERE is_event = true
- `idx_posts_article_type` — (article_type)

### 全文検索 (GIN)
- `idx_posts_search_vector` (tsvector) / `idx_posts_title_trgm` / `idx_posts_excerpt_trgm` (gin_trgm_ops)

### FK / その他
- post_categories / post_hashtags / reactions の FK インデックス
- ai_usage_logs (created_at DESC, session_id), ai_prompt_tags (order_num, tag_type), article_knowledge (is_active, slug)

---

## 9. RLS (Row Level Security)

全14テーブルで RLS 有効。`auth.role()` は `(select auth.role())` でサブクエリラップ済み。

### 公開テーブル (匿名 SELECT 許可)
- posts: `is_published = true` / categories: `is_active = true` / hashtags: 全件 / post_categories・post_hashtags: 全件 / reactions: 全件 (変更は RPC のみ) / ai_prompt_tags: `is_active = true` / ai_usage_limits: 全件 / article_knowledge: `is_active = true`

### 認証ユーザー限定 (匿名アクセス無し)
- ig_posts / ig_settings / mini_inquiries / long_inquiries: `(select auth.role()) = 'authenticated'` の ALL ポリシーのみ（匿名 SELECT/INSERT 無し）

> **情報窓口フォームの書き込み方針**: 公開フォーム送信は Server Action 内で `createAdminClient()` (service role) を使い RLS をバイパスして INSERT する。匿名 INSERT ポリシーは付けない (Zod 検証 + BotID + レート制限 + ハニーポットを Server Action 側で実施)。

---

## 10. RPC 関数一覧

increment_post_view_count / increment_reaction_count / decrement_reaction_count / search_posts / search_suggestions / match_articles / check_usage_limit / log_ai_usage / get_today_usage_stats / get_monthly_usage_stats / get_daily_usage_breakdown / get_top_queries / update_hashtag_count(trigger) / update_updated_at_column(trigger) / list_storage_objects

（引数・SECURITY・揮発性は `.claude/rules/database.md` を参照）

---

## 11. ユーティリティライブラリ

### 基盤
site-config / types / utils(cn) / supabase(3クライアント) / supabase-browser / seo-utils / structured-data / article-utils / view-counter / pagination-utils / hashtag-utils / filter-utils / category-colors / hooks/useDebounce / admin-auth(requireAdminAuth/assertAdminAuth)

### AI / ナレッジ
gemini (テキスト + 埋め込みモデル) / knowledge-generator / ai-prompt (FUNE ペルソナ) / ai-chat (検証 + 後処理) / ai-chat-client (SSE async generator)

### Instagram (Phase 3)
post-sections (h2 分割) / ig-caption-prompt / ig-caption-generator / ig-settings / ig-auto-generator / ig-action-utils / slug-utils
- `ig-article-*` (generator/prompt/credit/images) は不使用化。純粋ヘルパーは `article-ai-shared.ts` に集約

### 情報窓口フォーム (Phase 4)
- `mailer` — Gmail SMTP (Nodemailer) 通知 `sendInquiryNotification` (失敗してもフォーム送信は止めない)
- `rate-limit` — in-memory IP レート制限 (5分3件 MVP)
- `inquiry-schema` — Zod スキーマ (miniInquirySchema / longInquirySchema) + 画像制約定数
- `inquiry-images` — service role で inquiry-images バケットへ保存
- `inquiries` — ラベル定義 + 表示ヘルパー (Server/Client 両用)
- `article-ai-shared` — AI 記事生成の共通ヘルパー (Gemini リトライ / JSON 検証 / イベント正規化 / カテゴリ・タグ紐付け)
- `mini-article-prompt` / `mini-article-generator` — ミニ記事生成

---

## 12. CSS アニメーションシステム

### Tailwind (tailwind.config.ts)
- `animate-fade-in` (0.3s) / `animate-slide-in` (0.3s) / `animate-slide-in-up` (0.5s) / `animate-slide-in-left` (0.3s) — すべて fill-mode both

### globals.css
- `animate-fade-in-up` (0.4s) / `.stagger-1` ~ `.stagger-8` (delay 100〜800ms)

---

## 13. SEO 対策

- 全ページに title / description / OG / Twitter Card
- 構造化データ: Article / Breadcrumb / WebSite / Organization (JSON-LD)
- サイトマップ動的生成 / robots.txt (`/api/`・`/admin/` 除外) / canonical URL
- ISR: 記事 1時間 / ホーム 10分。静的: About / Privacy / 404
- noindex: 検索結果ページ / `/request/*/thanks` 完了画面

---

## 14. 認証 & セキュリティ

- **管理者認証**: パスワードベース (cookie `admin_auth`, 7日間)。`/admin/*` は `src/middleware.ts` で保護 + `x-pathname` ヘッダー注入
- **RLS**: 全14テーブルで有効
- **SECURITY DEFINER**: リアクション操作 / 閲覧数更新 / AI 利用管理
- **AI 利用制限**: セッションベース日次 + サイト月次
- **公開フォームのボット/スパム対策** (Phase 4):
  - Vercel BotID (`src/instrumentation-client.ts` で `/request/mini`・`/request/long` の POST を保護)
  - 電話番号必須 + 同意チェック必須
  - ハニーポット隠しフィールド
  - in-memory レート制限 (同一 IP 5分3件)
  - Server Action 内で Zod 検証 + service role INSERT

---

## 15. 環境変数

| 変数 | 必須 | 説明 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | 必須 | Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 必須 | Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | 必須 | Service Role Key (サーバーのみ) |
| `NEXT_PUBLIC_SITE_URL` | 必須 | サイト URL (通知メールの管理画面リンク生成に使用) |
| `ADMIN_PASSWORD` | 必須 | 管理者パスワード |
| `GEMINI_API_KEY` | 必須 | Gemini API キー |
| `GEMINI_MODEL` | 任意 | テキストモデル (default: gemini-3-flash-preview) |
| `EMBEDDING_MODEL` | 任意 | 埋め込みモデル (default: gemini-embedding-2-preview) |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | 任意 | GA4 測定 ID |
| `GMAIL_SMTP_USER` | 情報窓口で必須 | 送信元 Gmail |
| `GMAIL_SMTP_APP_PASSWORD` | 情報窓口で必須 | Google アプリパスワード (2段階認証必須) |
| `INQUIRY_NOTIFY_TO` | 情報窓口で必須 | 通知先メール |

---

## 16. パフォーマンス最適化 (実施済み)

### Next.js
- framer-motion 除去 → CSS-only アニメーション / React.cache() 重複排除 / ホーム ISR 化 / ChatPage 動的インポート / 検索の Promise.all 並列化 / Footer・WelcomeScreen の Server Component 化

### Supabase Postgres
- RLS の auth.role() サブクエリラップ / reactions の直接変更禁止 / 複合・部分インデックス / 重複インデックス削除 / Analytics 関数の STABLE 化

---

## 17. 管理パネル機能

### ダッシュボード (`/admin`)
統計カード (記事/閲覧/カテゴリ/タグ) + 最近の記事 + 人気記事 + カテゴリ別記事数

### 記事管理 (`/admin/posts`)
- 出自タブ (自由 / ミニ / ロング + 件数バッジ)、タイトル列に出自バッジ
- CRUD + Tiptap エディタ (見出し/リスト/画像/リンク/Figure/Box) + イベント情報編集 (EventInfoSection)
- カテゴリ/ハッシュタグ/サムネイル + 公開・下書き + おすすめ + event_ended
- 新規作成は `?from_inquiry=long&id=...` で取材依頼に紐付け + article_type='long' 固定
- ミニ記事の削除時は紐づく依頼を pending へ戻す（画像は依頼の持ち物として残す）
- 下書きプレビュー (`/admin/posts/[id]/preview`, chromeless)

### 依頼管理 (`/admin/inquiries`) — Phase 4
- ミニ/ロングのタブ切替 + 件数バッジ + `?open={id}` で詳細自動オープン
- ミニ: フィルタ + 詳細ダイアログ (メモ/ステータス/削除) + AI 記事化 (`/admin/inquiries/[id]/generate`)
- ロング: 案件管理 = 7段階ステータス / 取材日 (scheduled_at) / 金額 (fee_amount) / 記事紐付け / 新規記事作成導線
- 紐付いた post が公開化 (false→true) されると依頼を自動 'published' に更新
- Sidebar の「依頼管理」に pending 件数の赤バッジ (mini + long 合算)

### IG 投稿管理 (`/admin/instagram/posts`) — Phase 3
- ブログ記事を h2 セクション単位で IG 投稿下書きに変換 (セクション選択式生成 + 公開時自動生成 ON/OFF) + caption 編集

### カテゴリ / ハッシュタグ / メディア管理
- カテゴリ: CRUD + 表示順 + SEO メタ / ハッシュタグ: CRUD + カウント / メディア: thumbnails 一覧 + 使用状況チェック + 単体/一括削除

### AI ナレッジ / タグ / 統計
- ナレッジ: CRUD + 一括 Gemini 生成 (SSE) + 埋め込み再生成 / タグ: CRUD + 自動生成 / 統計: 日次・月次カード + 日別グラフ + TOP10 + 制限管理

---

## 18. Supabase プロジェクト情報

- **プロジェクト名**: sayo-blog
- **プロジェクト ID**: nkvohswifpmarobyrnbe
- **リージョン**: ap-northeast-1 (東京)
- **Storage バケット** (すべて public, SELECT 全員 / 書き込みは authenticated):
  - `thumbnails` — 記事サムネ + Tiptap 本文画像 (`/YYYY/MM/{timestamp}.{ext}`)
  - `ig-posts` — ブログ→IG 投稿画像 (Phase 3)
  - `inquiry-images` — 情報窓口フォーム添付画像 (`mini/{id}/{n}.{ext}`)
  - ※ `ig-imported` は Ticket 40 で削除
- **拡張機能**: pg_trgm, pgvector

---

## 19. 情報窓口フォーム（3 つの記事のかたち）— Phase 4

### 3 つの柱
| 区分 | 内容 | 料金 | AI |
|------|------|------|-----|
| 自由記事 | 紗代さん本人が自由に書く既存記事 | 無料 | — |
| ミニ記事 | SNS URL + 補足を窓口で受け、AI 補助でたたき台を作って公開する短い紹介記事 | 無料 | あり |
| ロング記事 | 取材依頼を受け、紗代さん本人が現地取材して書く記事 | 有料 (500円〜) | なし |

### ミニ記事フロー (`/request/mini` → 公開)
1. 公開フォーム送信 (Server Action `submitMiniInquiry`): BotID → レート制限 → ハニーポット → Zod → 画像を inquiry-images へ (service role) → `mini_inquiries` INSERT → Gmail SMTP 通知
2. 管理: `/admin/inquiries` で受付確認 → 詳細 → 「記事化する」
3. AI 記事化 (`/admin/inquiries/[id]/generate`): 紗代さんが SNS 本文を貼付 + 追加画像 → `generateMiniArticle` が Gemini で下書き posts (is_published=false, article_type='mini', source_urls 控え) を生成 → `/admin/posts/[id]` へ
4. 紗代さんが編集 → 公開

### ロング記事フロー (`/request/long` → 取材 → 公開)
1. 公開フォーム送信 (`submitLongInquiry`): 種別 (個人/組織/団体) で必須を出し分け → `long_inquiries` INSERT → Gmail SMTP 通知
2. 管理: `/admin/inquiries` (long タブ) で案件管理 — 7段階ステータス / 取材日 / 金額 / 内部メモ
3. 取材後、記事を作成し依頼に紐付け (既存記事 Select or 新規作成導線)。article_type は 'long' に。mini 記事は紐付け不可
4. 紐付いた記事を公開すると依頼が自動 'published' に

### メール通知
`mailer.ts::sendInquiryNotification({ type, inquiryId, summary })` — Gmail SMTP。件名「[Sayo's Journal] 新しい{ミニ/ロング}記事依頼が届きました」、本文に管理画面リンク (`?tab=...&open=...`)。送信失敗はログのみでフォーム送信は成功扱い。

---

## 20. Instagram 連携 — Phase 3 (ブログ → IG)

- IG 投稿する記事は「h2 見出し → 画像 → 文章」のセクション構造で書く（1 セクション = 1 IG 投稿）
- `parsePostSections` で h2 分割 → `generateIgCaptions` で Gemini がセクションごとにキャプション生成 → `ig_posts` に下書き保存
- 記事公開時に `triggerIgAutoGenerate` で自動下書き生成 (ON/OFF 設定可)
- Graph API 直接投稿 (Ticket 33) は保留中。現状は手動投稿運用
- 詳細ルールは `.claude/rules/instagram.md` 参照

---

## 21. AI Chat UI 改善 (2026-05-28)

ChatGPT/Gemini/Claude 風の体感に揃えるための実装:
- **レイアウト**: chat を `(chat)` ルートグループ化。公開 Header + main 専用高さで二重スクロールバーを構造的に回避
- **flex + min-h-0**: ChatPage / conversation / ChatMessages の各 flex 列に `min-h-0`（無いと内部 overflow-y-auto が効かず先頭メッセージが隠れる）
- **タイプライタ**: 受信した text チャンクを 50ms 間隔・バックログ加速で文字単位に可視化。表示完了まで入力欄を disable
- **SSE バッファ抑制**: `X-Accel-Buffering: no` + `Cache-Control: no-transform`
- **マーカー処理**: `[[slug]]` / `{{spot:name}}` の途中状態を「最後の `[[` 以降に `]]` が無ければ全部隠す」探索で除去
- **自動スクロール**: 最下部 80px 以内のみ追従。上にスクロール中は追従停止
- **カードのスタガー**: 記事/スポットカードを 350ms ずつ遅延で下からふわっと表示
- **文字サイズ**: 吹き出し本文 text-lg (18px) / prose-lg、AI 返信は会話エリア幅 (w-full)
