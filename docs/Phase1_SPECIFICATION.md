# Sayo's Journal — 実装仕様書

> **最終更新**: 2026-02-28
> **対象バージョン**: Phase 1 + Admin Panel + SEO + Interactive Enhancements 完了時点

---

## 目次

1. [プロジェクト概要](#1-プロジェクト概要)
2. [技術スタック](#2-技術スタック)
3. [ディレクトリ構成](#3-ディレクトリ構成)
4. [データベース設計](#4-データベース設計)
5. [認証・ミドルウェア](#5-認証ミドルウェア)
6. [公開ページ](#6-公開ページ)
7. [API エンドポイント](#7-api-エンドポイント)
8. [公開コンポーネント](#8-公開コンポーネント)
9. [管理画面 (Admin Panel)](#9-管理画面-admin-panel)
10. [ユーティリティ・ライブラリ](#10-ユーティリティライブラリ)
11. [SEO・構造化データ](#11-seo構造化データ)
12. [パフォーマンス戦略](#12-パフォーマンス戦略)
13. [環境変数](#13-環境変数)

---

## 1. プロジェクト概要

**Sayo's Journal** は、ライター・インタビュアー本岡紗代の「言葉 × 写真 × 体験」を綴るナラティブブログサイト。

- **URL**: https://www.sayo-kotoba.com (カスタムドメイン設定予定)
- **デプロイ先**: Vercel
- **データベース**: Supabase (ap-northeast-1)
- **ストレージ**: Supabase Storage (`thumbnails` バケット)

### カテゴリ構成 (フラット)

| slug | 表示名 |
|------|--------|
| gourmet | グルメ |
| event | イベント |
| spot | スポット |
| culture | カルチャー |
| news | ニュース |

---

## 2. 技術スタック

| レイヤー | 技術 | バージョン |
|----------|------|-----------|
| フレームワーク | Next.js (App Router) | 15 |
| 言語 | TypeScript | 5 |
| UI ライブラリ | React | 19.1.0 |
| スタイリング | Tailwind CSS | 3.4.17 |
| データベース | Supabase (PostgreSQL) | - |
| エディタ | Tiptap | 3.14.0 |
| アイコン | Lucide React | - |
| アニメーション | CSS Animations + IntersectionObserver | - |
| フォント | Playfair Display / Noto Serif JP / Noto Sans JP | - |

> **注**: Header, Footer, HeroSection のみ Framer Motion を使用。それ以外は CSS アニメーション。

---

## 3. ディレクトリ構成

```
src/
├── app/
│   ├── layout.tsx                    # ルートレイアウト (フォント, メタデータ, GA)
│   ├── globals.css                   # グローバルスタイル
│   ├── robots.ts                     # robots.txt
│   ├── sitemap.ts                    # 動的サイトマップ
│   ├── (public)/                     # 公開ページ (Header + Footer)
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # ホーム (無限スクロール)
│   │   ├── [category]/[slug]/page.tsx # 記事詳細
│   │   └── search/page.tsx           # 検索
│   ├── (auth)/admin/login/page.tsx   # ログイン
│   ├── (admin)/admin/                # 管理画面
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # ダッシュボード
│   │   ├── posts/                    # 記事管理
│   │   ├── categories/               # カテゴリ管理
│   │   ├── hashtags/                 # ハッシュタグ管理
│   │   └── media/                    # メディア管理
│   └── api/
│       ├── posts/route.ts            # 記事一覧 API
│       ├── posts/[slug]/view/route.ts # PV カウント
│       ├── search/suggest/route.ts   # サジェスト
│       ├── reactions/route.ts        # リアクション
│       ├── keepalive/route.ts        # ヘルスチェック
│       └── admin/                    # 管理 API
├── components/
│   ├── ui/                           # shadcn/ui ベース
│   ├── admin/                        # 管理画面コンポーネント
│   │   └── editor/                   # Tiptap エディタ
│   └── *.tsx                         # 公開コンポーネント
├── hooks/
│   └── useDebounce.ts
└── lib/
    ├── types.ts                      # 型定義
    ├── supabase.ts                   # サーバー側クライアント
    ├── supabase-browser.ts           # ブラウザ側シングルトン
    ├── site-config.ts                # サイト設定
    ├── seo-utils.ts                  # SEO ユーティリティ
    ├── structured-data.tsx           # JSON-LD
    ├── article-utils.ts              # 見出し抽出 (TOC 用)
    ├── filter-utils.ts               # フィルター状態管理
    ├── view-counter.ts               # PV カウント
    ├── category-colors.ts            # カテゴリ配色
    ├── hashtag-utils.ts              # タグクラウド計算
    ├── pagination-utils.ts           # ページネーション
    ├── motion-variants.ts            # Framer Motion プリセット
    └── utils.ts                      # cn() (clsx + tailwind-merge)
```

---

## 4. データベース設計

### 4.1 ER 図

```
posts ──< post_categories >── categories
  │                              │
  │                              └── (self-ref: parent_id)
  │
  ├──< post_hashtags >── hashtags
  │
  └──< reactions
```

### 4.2 テーブル定義

#### `posts`

| カラム | 型 | NULL | デフォルト | 備考 |
|--------|-----|------|-----------|------|
| id | uuid | NO | `gen_random_uuid()` | PK |
| title | text | NO | - | |
| slug | text | NO | - | UNIQUE |
| content | text | NO | - | HTML |
| excerpt | text | YES | - | |
| thumbnail_url | text | YES | - | |
| view_count | integer | YES | `0` | |
| published_at | timestamptz | YES | - | |
| updated_at | timestamptz | YES | `now()` | トリガーで自動更新 |
| is_published | boolean | YES | `false` | |
| created_at | timestamptz | YES | `now()` | |
| search_vector | tsvector | YES | GENERATED | 全文検索用 (自動生成) |

**search_vector 生成式**:
```sql
setweight(to_tsvector('simple', COALESCE(title, '')), 'A') ||
setweight(to_tsvector('simple', COALESCE(excerpt, '')), 'B') ||
setweight(to_tsvector('simple', COALESCE(content, '')), 'C')
```

#### `categories`

| カラム | 型 | NULL | デフォルト | 備考 |
|--------|-----|------|-----------|------|
| id | uuid | NO | `gen_random_uuid()` | PK |
| name | text | NO | - | |
| slug | text | NO | - | UNIQUE |
| parent_id | uuid | YES | - | 自己参照 FK (未使用) |
| order_num | integer | YES | `0` | 表示順 |
| description | text | YES | - | |
| image_url | text | YES | - | |
| meta_title | text | YES | - | |
| meta_description | text | YES | - | |
| is_active | boolean | YES | `true` | |
| created_at | timestamptz | YES | `now()` | |
| updated_at | timestamptz | YES | `now()` | |

#### `hashtags`

| カラム | 型 | NULL | デフォルト | 備考 |
|--------|-----|------|-----------|------|
| id | uuid | NO | `gen_random_uuid()` | PK |
| name | text | NO | - | UNIQUE |
| slug | text | NO | - | UNIQUE |
| count | integer | YES | `0` | トリガーで自動更新 |
| created_at | timestamptz | YES | `now()` | |
| updated_at | timestamptz | YES | `now()` | |

#### `post_categories` (中間テーブル)

| カラム | 型 | NULL | デフォルト | 備考 |
|--------|-----|------|-----------|------|
| post_id | uuid | NO | - | PK, FK → posts (CASCADE) |
| category_id | uuid | NO | - | PK, FK → categories (CASCADE) |
| created_at | timestamptz | YES | `now()` | |

#### `post_hashtags` (中間テーブル)

| カラム | 型 | NULL | デフォルト | 備考 |
|--------|-----|------|-----------|------|
| post_id | uuid | NO | - | PK, FK → posts (CASCADE) |
| hashtag_id | uuid | NO | - | PK, FK → hashtags (CASCADE) |
| created_at | timestamptz | YES | `now()` | |

#### `reactions`

| カラム | 型 | NULL | デフォルト | 備考 |
|--------|-----|------|-----------|------|
| id | uuid | NO | `gen_random_uuid()` | PK |
| post_id | uuid | NO | - | FK → posts (CASCADE) |
| reaction_type | text | NO | - | CHECK: light, heart, thumbs, fire |
| count | integer | NO | `0` | |
| created_at | timestamptz | YES | `now()` | |
| updated_at | timestamptz | YES | `now()` | |

**UNIQUE制約**: `(post_id, reaction_type)`

### 4.3 RLS ポリシー

| テーブル | ポリシー | 操作 | 条件 |
|----------|---------|------|------|
| posts | Public can view published posts | SELECT | `is_published = true` |
| posts | Authenticated users can do everything | ALL | `auth.role() = 'authenticated'` |
| categories | Public can view active categories | SELECT | `is_active = true` |
| categories | Authenticated users can do everything | ALL | `auth.role() = 'authenticated'` |
| hashtags | Public can view all hashtags | SELECT | `true` |
| hashtags | Authenticated users can do everything | ALL | `auth.role() = 'authenticated'` |
| post_categories | Public can view | SELECT | `true` |
| post_categories | Authenticated users can do everything | ALL | `auth.role() = 'authenticated'` |
| post_hashtags | Public can view | SELECT | `true` |
| post_hashtags | Authenticated users can do everything | ALL | `auth.role() = 'authenticated'` |
| reactions | reactions_select | SELECT | `true` |
| reactions | reactions_insert | INSERT | `true` (匿名投稿可) |
| reactions | reactions_update | UPDATE | `true` |

### 4.4 トリガー

| トリガー | テーブル | イベント | 関数 |
|----------|---------|---------|------|
| trigger_update_posts_updated_at | posts | BEFORE UPDATE | `update_updated_at_column()` |
| trigger_update_categories_updated_at | categories | BEFORE UPDATE | `update_updated_at_column()` |
| trigger_update_hashtag_count | post_hashtags | AFTER INSERT | `update_hashtag_count()` |
| trigger_update_hashtag_count | post_hashtags | AFTER DELETE | `update_hashtag_count()` |

### 4.5 RPC 関数

#### `increment_post_view_count(post_slug text)` → integer
- **SECURITY DEFINER** (RLS バイパス)
- 公開済み記事の view_count を +1 し、新しい値を返す

#### `increment_reaction_count(p_post_id uuid, p_reaction_type text)` → integer
- **SECURITY DEFINER** (RLS バイパス)
- UPSERT: 存在すれば +1、なければ count=1 で INSERT
- 新しい count を返す

#### `search_posts(search_query text, result_limit int, result_offset int)` → TABLE
- tsvector 全文検索 + pg_trgm 類似度検索のハイブリッド
- 重み: title (A) > excerpt (B) > content (C)
- 類似度スコアでソート、published_at で二次ソート

#### `search_suggestions(search_query text)` → TABLE
- title, excerpt の ILIKE 部分一致
- view_count DESC でソート、上位 5 件

#### `list_storage_objects(bucket_name text)` → TABLE
- **SECURITY DEFINER**
- storage.objects からファイル一覧を取得

### 4.6 インデックス

| テーブル | インデックス | 種類 |
|----------|------------|------|
| posts | idx_posts_slug | btree |
| posts | idx_posts_is_published | btree |
| posts | idx_posts_published_at | btree (DESC) |
| posts | idx_posts_view_count | btree (DESC) |
| posts | idx_posts_search_vector | GIN |
| posts | idx_posts_title_trgm | GIN (gin_trgm_ops) |
| posts | idx_posts_excerpt_trgm | GIN (gin_trgm_ops) |
| categories | idx_categories_slug | btree |
| categories | idx_categories_parent_id | btree |
| categories | idx_categories_order_num | btree |
| categories | idx_categories_is_active | btree |
| hashtags | idx_hashtags_name | btree |
| hashtags | idx_hashtags_slug | btree |
| hashtags | idx_hashtags_count | btree (DESC) |
| post_categories | idx_post_categories_post_id | btree |
| post_categories | idx_post_categories_category_id | btree |
| post_hashtags | idx_post_hashtags_post_id | btree |
| post_hashtags | idx_post_hashtags_hashtag_id | btree |
| reactions | idx_reactions_post_id | btree |

**有効な拡張機能**: `pg_trgm` (trigram 類似度検索)

---

## 5. 認証・ミドルウェア

### ミドルウェア (`src/middleware.ts`)

- **対象**: `/admin/*` (ログインページ除外)
- **方式**: Cookie ベース (`admin_auth = 'authenticated'`)
- 未認証 → `/admin/login?redirect={pathname}` へリダイレクト
- 認証済みでログインページアクセス → `/admin` へリダイレクト

### ログイン API (`/api/admin/login`)

- `ADMIN_PASSWORD` 環境変数との照合
- 成功時: `admin_auth` Cookie を Set (httpOnly, secure, sameSite=lax, 7日間)
- 失敗時: 401

### ログアウト API (`/api/admin/logout`)

- `admin_auth` Cookie を削除 (maxAge=0)

---

## 6. 公開ページ

### 6.1 ホームページ (`/`)

| 項目 | 値 |
|------|-----|
| ファイル | `src/app/(public)/page.tsx` |
| レンダリング | ISR (`revalidate = 600`, `dynamic = 'force-dynamic'`) |
| 初期表示 | 6 記事 |
| データ取得 | categories, popularHashtags, posts を並列取得 |

**機能**:
- HeroSection (キービジュアル + スクロールインジケーター)
- FilterBar (カテゴリ / ハッシュタグ / ソート)
- InfinitePostGrid (Intersection Observer で無限スクロール)
- PopularHashtags (タグクラウド、上位 30 件)

**フィルタリング**:
- `?category=gourmet` — カテゴリ絞り込み
- `?hashtags=tag1,tag2` — ハッシュタグ絞り込み (AND)
- `?sort=popular` — ソート (latest / popular / title)

**ハッシュタグフィルタの N+1 回避**:
1. `post_hashtags` から該当 post_id の Set を取得
2. `posts.in('id', postIds)` で一括取得

### 6.2 記事詳細ページ (`/[category]/[slug]`)

| 項目 | 値 |
|------|-----|
| ファイル | `src/app/(public)/[category]/[slug]/page.tsx` |
| レンダリング | ISR (`revalidate = 3600`) |
| 静的生成 | 上位 30 記事を事前生成 (`generateStaticParams`) |

**構成要素** (上から順):
1. **Breadcrumbs** — パンくずリスト (BreadcrumbList JSON-LD 付き)
2. **ArticleHero** — サムネイル、タイトル、メタ情報
3. **ScrollProgress** — 読了プログレスバー (固定、上端)
4. **TableOfContents** — 目次 (デスクトップ: 右サイドバー固定、モバイル: 折りたたみ)
5. **ArticleBody** — 本文 HTML (`prose` スタイリング)
6. **ArticleMeta** — ハッシュタグ、カテゴリ、日付、PV
7. **ReactionBar** — リアクションボタン 4 種
8. **RelatedArticles** — 関連記事 3 件
9. **ImageLightbox** — 画像拡大モーダル

**レイアウト**:
- ヒーロー: `max-w-4xl`
- 本文 + TOC: `max-w-6xl` + `lg:flex lg:gap-8`
- デスクトップ: 本文 (flex-1) + TOC サイドバー (w-56)
- モバイル: TOC → 本文 の縦並び

**コンテンツ処理**:
- `processArticleContent()` で h2/h3 に一意の ID を付与
- 見出しデータを抽出し TOC に渡す

### 6.3 検索ページ (`/search`)

| 項目 | 値 |
|------|-----|
| ファイル | `src/app/(public)/search/page.tsx` |
| レンダリング | Dynamic (キャッシュなし) |
| ページサイズ | 12 件/ページ |

**機能**:
- SearchBar (デバウンス 300ms のサジェスト付き)
- PostGrid (静的グリッド表示)
- Pagination (ページ番号 + 省略記号)
- 空の検索結果時: 検索のヒント表示

**検索**: Supabase RPC `search_posts()` (全文検索 + trigram)

---

## 7. API エンドポイント

### `GET /api/posts`

記事一覧の取得 (無限スクロール用)。

**クエリパラメータ**:
| パラメータ | 型 | デフォルト | 説明 |
|-----------|-----|-----------|------|
| category | string | - | カテゴリ slug |
| hashtags | string | - | カンマ区切りハッシュタグ slug |
| sort | string | `latest` | latest / popular / title |
| page | number | `1` | ページ番号 |
| limit | number | `6` | 1 ページあたり件数 |

**レスポンス**:
```json
{
  "posts": [PostWithRelations],
  "count": 90,
  "hasMore": true,
  "page": 1
}
```

### `POST /api/posts/[slug]/view`

PV カウントのインクリメント。RPC `increment_post_view_count` を呼び出す。

### `GET /api/search/suggest?q=keyword`

検索サジェスト (最小 2 文字)。

**レスポンス**:
```json
{
  "posts": [{ "id", "title", "slug", "thumbnail_url" }],
  "hashtags": [{ "id", "name", "slug", "count" }]
}
```

### `GET /api/reactions?postId=xxx`

記事のリアクション数を取得。

**レスポンス**:
```json
{ "light": 5, "heart": 3, "thumbs": 1, "fire": 0 }
```

### `POST /api/reactions`

リアクションの追加。RPC `increment_reaction_count` を呼び出す。

**リクエスト**:
```json
{ "post_id": "uuid", "reaction_type": "light" }
```

### `GET /api/keepalive?token=xxx`

ヘルスチェック。`KEEPALIVE_TOKEN` と照合。

### `POST /api/admin/login`

管理者ログイン。Cookie を発行。

### `POST /api/admin/logout`

管理者ログアウト。Cookie を削除。

### `GET /api/admin/media`

メディアファイル一覧 (認証必須)。

---

## 8. 公開コンポーネント

### 8.1 ページ構成コンポーネント

| コンポーネント | 種別 | 説明 |
|--------------|------|------|
| Header | Client | スティッキーナビ、モバイルメニュー、検索バー |
| Footer | Client | ブランド情報、サイトリンク、SNS リンク |
| HeroSection | Client | ホームのヒーロー (SVG パターン背景) |
| Breadcrumbs | Server | パンくずリスト + JSON-LD |

### 8.2 記事表示コンポーネント

| コンポーネント | 種別 | 説明 |
|--------------|------|------|
| InfinitePostGrid | Client | 無限スクロール (Intersection Observer、6件/回) |
| PostGrid | Server | 静的グリッド (検索結果用) |
| PostCard | Server | カード (サムネイル、タイトル、抜粋、タグ、日付、PV) |
| ArticleHero | Server | 記事ヒーロー (サムネイル + オーバーレイ) |
| ArticleBody | Server | 本文 HTML レンダリング (`prose` スタイル) |
| ArticleMeta | Server | 記事フッター (タグ、カテゴリ、日付) |

### 8.3 インタラクティブコンポーネント

| コンポーネント | 種別 | 説明 |
|--------------|------|------|
| ScrollProgress | Client | 読了プログレスバー (CSS scaleX、z-60) |
| TableOfContents | Client | 目次 (デスクトップ: sticky sidebar、モバイル: 折りたたみ) |
| ImageLightbox | Client | 画像拡大 (native `<dialog>`、キーボード/スワイプ対応) |
| ReactionBar | Client | リアクション 4 種 (localStorage + Supabase、楽観的更新) |
| RelatedArticles | Server | 関連記事 3 件 (スコアリング: カテゴリ +10、タグ +3) |
| ScrollFadeIn | Client | スクロールフェードイン (IntersectionObserver) |

### 8.4 フィルタ・検索コンポーネント

| コンポーネント | 種別 | 説明 |
|--------------|------|------|
| FilterBar | Client | カテゴリ / ハッシュタグ / ソート / クリア |
| CategorySelect | Client | カテゴリドロップダウン |
| SortSelect | Client | ソートドロップダウン (latest / popular / title) |
| HashtagInput | Client | マルチセレクト (オートコンプリート付き) |
| SearchBar | Client | 検索バー (デバウンス 300ms + サジェスト) |

### 8.5 その他

| コンポーネント | 種別 | 説明 |
|--------------|------|------|
| PopularHashtags | Server | タグクラウド (上位 30 件、フォントサイズ動的) |
| HashtagList | Server | ハッシュタグ一覧 (カード用、最大 3 件表示) |
| HashtagLink | Client | タグクラウド内の個別タグ |
| CategoryBadge | Server | カテゴリバッジ (グラデーション背景) |
| Pagination | Client | ページネーション (省略記号対応) |
| ViewCounter | Client | PV カウンター (非表示、マウント時に 1 回発火) |
| GoogleAnalytics | Server | GA4 スクリプト (環境変数で制御) |

---

## 9. 管理画面 (Admin Panel)

### 9.1 レイアウト

- **サイドバー** (固定 256px): Dashboard / Posts / Categories / Hashtags / Media
- **ヘッダー** (固定 64px): ログアウトボタン
- **メインエリア**: スクロール可能コンテンツ
- `<meta name="robots" content="noindex, nofollow" />`

### 9.2 ダッシュボード (`/admin`)

4 つの統計カード:
- 記事数 (公開 / 下書き)
- 総 PV 数
- カテゴリ数
- ハッシュタグ数

コンテンツセクション:
- 最新記事 5 件
- 人気記事 5 件
- カテゴリ別記事数

### 9.3 記事管理 (`/admin/posts`)

**一覧**: テーブル形式、カテゴリ・ステータスでフィルタ可能

**新規作成 / 編集**: PostForm コンポーネント
- 2 カラムレイアウト (本文 + サイドバー)
- タイトル → slug 自動生成 (日本語対応)
- Tiptap リッチテキストエディタ
- サムネイル画像のアップロード / ライブラリ選択
- カテゴリ選択 (必須)
- ハッシュタグ選択 (複数可)
- 公開状態・公開日時の設定
- 抜粋 (150 文字制限)

**Server Actions**:
- `createPost(data)` — INSERT + 中間テーブル
- `updatePost(id, data)` — UPDATE + 中間テーブル再作成
- `deletePost(id)` — DELETE (CASCADE)

### 9.4 カテゴリ管理 (`/admin/categories`)

**一覧**: 順番、名前、slug、説明、記事数
**削除保護**: 記事が紐づいている場合は削除不可 (エラーダイアログ)

**フォーム**: 名前、slug (自動生成)、説明、表示順

### 9.5 ハッシュタグ管理 (`/admin/hashtags`)

**一覧**: 名前、slug、使用数
**一括削除**: 未使用タグの一括削除機能

**フォーム**: 名前、slug (自動生成、日本語対応)

### 9.6 メディア管理 (`/admin/media`)

**一覧**: グリッド表示 (2〜5 カラム、レスポンシブ)

**機能**:
- URL コピー
- 個別削除 (使用状況チェック付き)
- 一括選択・一括削除
- 使用中の画像は警告表示 (どの記事で使用しているか)
- サムネイル参照の自動クリア

**ストレージパス**: `thumbnails/{year}/{month}/{timestamp}.{ext}`

### 9.7 リッチテキストエディタ

**Tiptap 拡張機能**:
- StarterKit (見出し、太字、斜体、取消線、リスト、引用、水平線)
- Image
- Link (カスタムダイアログ)
- Placeholder
- BoxExtension (カスタム: ハイライトボックス)
- FigureExtension (カスタム: `<figure>` + `<figcaption>`)

**ツールバー**: 見出し / テキスト装飾 / リスト / 要素 / リンク / 画像 / Undo・Redo

**フローティングメニュー**: 空行で表示 (画像挿入、水平線、H2、H3)

**バブルメニュー**: テキスト選択時に表示 (装飾、リスト、ボックス、リンク)

**FigureExtension のノード操作**:
- 画像クリックで NodeSelection → Delete/Backspace で削除可能
- `selectNode()` / `deselectNode()` で選択状態の CSS 管理
- `contentDOM = figcaption` でキャプション編集可能

---

## 10. ユーティリティ・ライブラリ

### 型定義 (`src/lib/types.ts`)

```typescript
interface Post {
  id: string; title: string; slug: string; content: string;
  excerpt?: string; thumbnail_url?: string; view_count: number;
  published_at?: string; updated_at: string; is_published: boolean;
  created_at: string;
}

interface Category {
  id: string; name: string; slug: string; parent_id?: string;
  order_num: number; description?: string; image_url?: string;
  meta_title?: string; meta_description?: string; is_active: boolean;
}

interface Hashtag {
  id: string; name: string; slug: string; count: number;
}

interface Reaction {
  id: string; post_id: string; reaction_type: string;
  count: number;
}

interface PostWithRelations extends Post {
  post_categories: Array<{ categories: Category }>;
  post_hashtags: Array<{ hashtags: Hashtag }>;
}
```

### Supabase クライアント (`src/lib/supabase.ts`)

| 関数 | 用途 | session 永続化 | 自動更新 |
|------|------|--------------|---------|
| `createClient()` | Server Component / Route Handler | No | No |
| `createServerClient()` | 認証が必要な Server Component | Yes (Cookie) | No |
| `createAdminClient()` | Service Role 操作 | No | No |

**ブラウザ側** (`src/lib/supabase-browser.ts`):
- `getSupabaseBrowser()` — シングルトン (session 永続化なし)

### article-utils (`src/lib/article-utils.ts`)

```typescript
function processArticleContent(html: string): {
  processedHtml: string  // id 付きの HTML
  headings: TocHeading[] // TOC データ
}
```
- h2, h3 を正規表現で抽出
- URL フレンドリーな ID を生成 (日本語対応)
- 重複 ID の回避

### サイト設定 (`src/lib/site-config.ts`)

```typescript
const SITE_CONFIG = {
  name: "Sayo's Journal",
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://sayo-blog.vercel.app',
  locale: 'ja_JP',
  author: { name: '本岡紗代', nameEn: 'Sayo Motooka' },
  themeColor: '#FF6B9D',
  // ...
}
```

---

## 11. SEO・構造化データ

### メタデータ

- **ルートレイアウト**: サイト全体のデフォルト (OG, Twitter, robots)
- **記事ページ**: 動的メタデータ (title, description, keywords, canonical, OG image)
- **検索ページ**: `robots: { index: false }` (インデックス除外)

### robots.txt

```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Sitemap: {SITE_URL}/sitemap.xml
```

### サイトマップ

- ホーム (priority 1.0, daily)
- カテゴリ URL (priority 0.6, daily)
- 全公開記事 (priority 0.8, weekly, lastModified 付き)

### 構造化データ (JSON-LD)

| スキーマ | 配置 | データ |
|---------|------|--------|
| WebSite | ルートレイアウト | サイト名、URL、検索アクション |
| Organization | ルートレイアウト | 著者情報 |
| Article | 記事ページ | タイトル、日付、著者、画像 |
| BreadcrumbList | 記事ページ | パンくず階層 |

---

## 12. パフォーマンス戦略

### ISR (Incremental Static Regeneration)

| ページ | revalidate | 備考 |
|--------|-----------|------|
| ホーム | 600s (10 分) | `force-dynamic` |
| 記事詳細 | 3600s (1 時間) | 上位 30 件を事前生成 |
| 検索 | なし (dynamic) | キャッシュなし |

### 最適化済み項目

- ハッシュタグフィルタの N+1 回避 (2 ステップクエリ)
- ArticleBody を Server Component 化 (JS 削減)
- CSS アニメーション (GPU アクセラレーション: transform, opacity)
- `prefers-reduced-motion` 対応
- 検索: RPC によるサーバーサイドページネーション
- 画像: Next.js Image + sizes 属性
- PV カウント: localStorage で重複防止

### リアクションシステム

- **楽観的更新**: クリック即座に UI 反映
- **localStorage**: 重複リアクション防止
- **RPC UPSERT**: アトミックなカウンター更新
- **エラー時**: 楽観的更新をロールバックしない (UX 優先)

---

## 13. 環境変数

### 必須

| 変数名 | 説明 |
|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名キー |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase サービスロールキー |
| `NEXT_PUBLIC_SITE_URL` | サイト URL (SEO・OG 用) |
| `ADMIN_PASSWORD` | 管理画面パスワード |

### オプション

| 変数名 | 説明 |
|--------|------|
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics 4 測定 ID |
| `KEEPALIVE_TOKEN` | ヘルスチェック API トークン |
