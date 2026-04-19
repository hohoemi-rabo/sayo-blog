# Ticket 29: Phase 3 共通基盤（DB + Storage + 型 + Sidebar）

> **フェーズ**: Phase 3 土台（最優先）
> **依存**: なし
> **ブロック**: 30, 31, 32, 33, 34, 35, 36, 37, 38

---

## 概要

Phase 3 全体で共有する基盤を整備する。DB スキーマ 4 テーブル、Storage バケット 2 件、TypeScript 型定義、管理パネルサイドバー拡張、および `ig_settings` の初期値投入をまとめて行う。
Phase 3A・3B すべての後続チケットの土台となるため、最初に実装する。

---

## 実装内容

### 1. データベーススキーマ

既存 Supabase プロジェクト `sayo-blog`（ID: `nkvohswifpmarobyrnbe`）に以下 4 テーブルを追加する。

#### 1.1 `ig_posts`（ブログ→IG 投稿管理）

| カラム | 型 | 制約 | 備考 |
|--------|-----|-----|------|
| id | uuid | PK, default gen_random_uuid() | |
| post_id | uuid | NOT NULL, FK → posts.id (CASCADE) | 元ブログ記事 |
| caption | text | NOT NULL | AI 生成キャプション |
| hashtags | text[] | NOT NULL, default '{}' | ハッシュタグ配列（計10） |
| image_url | text | nullable | Storage 上の IG 投稿画像 |
| sequence_number | integer | NOT NULL, default 1 | 同一記事内の通し番号 |
| status | text | NOT NULL, default 'draft', CHECK IN ('draft','published','manual_published') | |
| instagram_media_id | text | nullable | Graph API 投稿後のメディア ID |
| instagram_published_at | timestamptz | nullable | |
| created_at | timestamptz | default now() | |
| updated_at | timestamptz | default now() | |

#### 1.2 `ig_sources`（IG 取得先アカウント）

| カラム | 型 | 制約 | 備考 |
|--------|-----|-----|------|
| id | uuid | PK, default gen_random_uuid() | |
| ig_username | text | NOT NULL, UNIQUE | @ 以降 |
| display_name | text | NOT NULL | 店舗名等 |
| category_slug | text | nullable | デフォルトカテゴリ |
| permission_status | text | NOT NULL, default 'not_requested', CHECK IN ('not_requested','requested','approved','denied') | |
| permission_date | date | nullable | |
| permission_memo | text | nullable | |
| contact_info | text | nullable | |
| is_active | boolean | NOT NULL, default false | |
| last_fetched_at | timestamptz | nullable | |
| created_at | timestamptz | default now() | |
| updated_at | timestamptz | default now() | |

#### 1.3 `ig_imported_posts`（IG→ブログ 取得済み投稿）

| カラム | 型 | 制約 | 備考 |
|--------|-----|-----|------|
| id | uuid | PK, default gen_random_uuid() | |
| source_id | uuid | NOT NULL, FK → ig_sources.id (CASCADE) | |
| ig_post_id | text | NOT NULL, UNIQUE | 重複防止キー |
| caption | text | nullable | |
| image_urls | text[] | nullable | IG 側の元画像 URL |
| ig_posted_at | timestamptz | nullable | |
| likes_count | integer | nullable | |
| ig_post_url | text | nullable | |
| status | text | NOT NULL, default 'pending', CHECK IN ('pending','processing','published','skipped') | |
| generated_post_id | uuid | nullable, FK → posts.id (SET NULL) | 生成記事 |
| stored_image_urls | text[] | nullable | Storage 保存後 URL |
| created_at | timestamptz | default now() | |
| updated_at | timestamptz | default now() | |

#### 1.4 `ig_settings`（Instagram 連携設定）

| カラム | 型 | 制約 | 備考 |
|--------|-----|-----|------|
| id | uuid | PK, default gen_random_uuid() | |
| setting_key | text | NOT NULL, UNIQUE | |
| setting_value | jsonb | NOT NULL, default '{}' | |
| updated_at | timestamptz | default now() | |

### 2. インデックス

```sql
CREATE INDEX idx_ig_posts_post_id ON ig_posts(post_id);
CREATE INDEX idx_ig_posts_status ON ig_posts(status);
CREATE INDEX idx_ig_sources_permission ON ig_sources(permission_status);
CREATE INDEX idx_ig_sources_active ON ig_sources(is_active);
CREATE INDEX idx_ig_imported_source ON ig_imported_posts(source_id);
CREATE INDEX idx_ig_imported_status ON ig_imported_posts(status);
-- ig_post_id は UNIQUE 制約により自動で index が付くため追加不要
```

### 3. RLS ポリシー

全 4 テーブルで RLS 有効化。匿名ユーザーはアクセス不可、認証ユーザーのみ ALL。

```sql
ALTER TABLE ig_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_ig_posts" ON ig_posts
  FOR ALL USING ((select auth.role()) = 'authenticated');
-- 他 3 テーブル同様
```

※ `auth.role()` は必ず `(select auth.role())` でラップ（RLS 高速化のため）。

### 4. updated_at トリガー

既存の `update_updated_at_column()` を 4 テーブル全てに適用。

### 5. Storage バケット作成

| バケット名 | 公開 | 用途 |
|-----------|------|------|
| `ig-posts` | public | ブログ→IG 方向の投稿画像 |
| `ig-imported` | public | IG→ブログ方向の取得画像 |

Storage ポリシー: 認証ユーザーのみ upload/delete 可、公開 URL は誰でも取得可能。

### 6. 初期設定データ（ig_settings）

以下 3 レコードを INSERT する。

| setting_key | setting_value |
|-------------|---------------|
| `caption_config` | `{"required_hashtags": ["#長野県飯田市", "#sayosjournalブログ記事"], "min_length": 200, "max_length": 400, "generated_hashtag_count": 8}` |
| `auto_generate` | `{"enabled": true, "count_on_publish": 1}` |
| `instagram_account` | `{"username": "fune.iida.toyooka.odekake", "facebook_page_connected": true}` |

※ Instagram Graph API トークンは DB に保存せず、都度 FB SDK から取得する設計。

### 7. TypeScript 型定義

`src/lib/types.ts` に以下を追加：

```typescript
export type IgPostStatus = 'draft' | 'published' | 'manual_published'
export type IgPermissionStatus = 'not_requested' | 'requested' | 'approved' | 'denied'
export type IgImportedStatus = 'pending' | 'processing' | 'published' | 'skipped'

export interface IgPost {
  id: string
  post_id: string
  caption: string
  hashtags: string[]
  image_url: string | null
  sequence_number: number
  status: IgPostStatus
  instagram_media_id: string | null
  instagram_published_at: string | null
  created_at: string
  updated_at: string
}

export interface IgPostWithRelations extends IgPost {
  post?: Pick<Post, 'id' | 'title' | 'slug' | 'thumbnail_url'>
}

export interface IgSource {
  id: string
  ig_username: string
  display_name: string
  category_slug: string | null
  permission_status: IgPermissionStatus
  permission_date: string | null
  permission_memo: string | null
  contact_info: string | null
  is_active: boolean
  last_fetched_at: string | null
  created_at: string
  updated_at: string
}

export interface IgImportedPost {
  id: string
  source_id: string
  ig_post_id: string
  caption: string | null
  image_urls: string[] | null
  ig_posted_at: string | null
  likes_count: number | null
  ig_post_url: string | null
  status: IgImportedStatus
  generated_post_id: string | null
  stored_image_urls: string[] | null
  created_at: string
  updated_at: string
}

export interface IgImportedPostWithSource extends IgImportedPost {
  source?: Pick<IgSource, 'ig_username' | 'display_name' | 'category_slug'>
}

export interface IgCaptionConfig {
  required_hashtags: string[]
  min_length: number
  max_length: number
  generated_hashtag_count: number
}

export interface IgAutoGenerateConfig {
  enabled: boolean
  count_on_publish: number
}
```

### 8. 管理パネルサイドバー拡張

`src/components/admin/Sidebar.tsx` を編集し、「📷 Instagram 連携」セクションを追加する。

```
既存メニュー:
  📝 記事管理
  📁 カテゴリ管理
  🏷️ ハッシュタグ管理
  🖼️ メディア管理

追加メニュー:                      ← NEW
  📷 Instagram 連携
    ├── IG 投稿管理       /admin/instagram/posts
    ├── 取得先アカウント  /admin/instagram/sources
    └── 取得投稿          /admin/instagram/imports

既存メニュー:
  🤖 AI 管理
    ├── ナレッジ管理
    ├── タグ管理
    └── 利用統計
```

※ 画面本体は後続チケットで実装するため、リンク先は 404 になる時点で問題なし。ただし `/admin/instagram/` 直下にはプレースホルダー `page.tsx` を置き `redirect('/admin/instagram/posts')` とする。

### 9. Supabase Migration

`supabase/migrations/` に新規ファイル `YYYYMMDDHHMMSS_phase3_instagram_tables.sql` を追加。
MCP の `mcp__supabase__apply_migration` で既存 sayo-blog プロジェクトに適用する。

---

## ファイル構成

```
supabase/migrations/
└── YYYYMMDDHHMMSS_phase3_instagram_tables.sql  # 新規

src/lib/types.ts                                 # 型追加
src/components/admin/Sidebar.tsx                 # サイドバー拡張
src/app/(admin)/admin/instagram/page.tsx         # 新規 (redirect)
```

---

## 完了条件

- [ ] pgvector は既存のまま、4 テーブル（ig_posts, ig_sources, ig_imported_posts, ig_settings）が作成されている
- [ ] インデックス 6 件が作成されている
- [ ] 全 4 テーブルで RLS が有効かつ認証ユーザーのみ ALL 操作可
- [ ] updated_at トリガーが 4 テーブルに適用されている
- [ ] Storage バケット `ig-posts` `ig-imported` が公開設定で作成されている
- [ ] Storage ポリシーで認証ユーザーのみ upload/delete 可になっている
- [ ] `ig_settings` に初期 3 レコード（caption_config / auto_generate / instagram_account）が投入されている
- [ ] TypeScript 型（IgPost, IgSource, IgImportedPost, 関連 interfaces）が `lib/types.ts` に追加されている
- [ ] 管理パネルサイドバーに「📷 Instagram 連携」セクションと 3 サブメニューが追加されている
- [ ] `/admin/instagram/` にアクセスすると `/admin/instagram/posts` にリダイレクトする
- [ ] `npm run build` が成功する
