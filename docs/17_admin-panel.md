# Ticket 17: 管理画面（Admin Panel）

## 概要

Next.js App Router + shadcn/ui + Tiptapを使用した管理画面の実装。
Payload CMSの代わりに、シンプルで確実なカスタム管理画面を構築する。

## 技術スタック

| 項目 | 技術 |
|------|------|
| フレームワーク | Next.js 15 (App Router) |
| 言語 | TypeScript |
| データベース | Supabase (PostgreSQL) |
| UIライブラリ | shadcn/ui |
| リッチテキスト | Tiptap |
| 画像ストレージ | Supabase Storage |
| 認証 | Cookie + Middleware（簡易パスワード認証） |

## 機能要件

### 1. 認証

| 機能 | 説明 |
|------|------|
| ログイン | パスワードによる簡易認証 |
| ログアウト | セッション破棄 |
| セッション維持 | 7日間有効なCookie |
| ルート保護 | Middlewareで/admin/*を保護 |

### 2. ダッシュボード

| 表示項目 | 説明 |
|----------|------|
| 記事数 | 公開/下書き別 |
| 総閲覧数 | 全記事のview_count合計 |
| 最近の記事 | 直近5件の記事リスト |
| 人気記事 | 閲覧数上位5件 |
| カテゴリ別記事数 | 各カテゴリの記事数 |

### 3. 記事管理（Posts）

| 機能 | 説明 |
|------|------|
| 一覧表示 | タイトル、カテゴリ、公開状態、公開日、閲覧数 |
| 検索・フィルタ | カテゴリ、公開状態でフィルタ |
| 新規作成 | フォームから記事を作成 |
| 編集 | 既存記事の編集 |
| 削除 | 記事の削除（確認ダイアログ付き） |
| プレビュー | 公開前のプレビュー表示 |

#### 記事フォームフィールド

| フィールド | 型 | 必須 | 説明 |
|------------|-----|------|------|
| title | text | ✅ | 記事タイトル |
| slug | text | ✅ | URL用スラッグ（自動生成可） |
| content | richtext | ✅ | 本文（Tiptapエディタ） |
| excerpt | textarea | - | 抜粋（150文字程度） |
| thumbnail | file | - | サムネイル画像 |
| category | select | ✅ | カテゴリ選択 |
| hashtags | multi-select | - | ハッシュタグ（複数選択） |
| published_at | datetime | - | 公開日時 |
| is_published | checkbox | - | 公開/下書き |

### 4. カテゴリ管理（Categories）

| 機能 | 説明 |
|------|------|
| 一覧表示 | 名前、スラッグ、記事数、並び順 |
| 新規作成 | カテゴリの追加 |
| 編集 | 名前、スラッグ、説明、並び順の編集 |
| 削除 | カテゴリの削除（記事がある場合は警告） |
| 並び替え | ドラッグ&ドロップまたは数値入力 |

#### カテゴリフォームフィールド

| フィールド | 型 | 必須 | 説明 |
|------------|-----|------|------|
| name | text | ✅ | カテゴリ名（日本語） |
| slug | text | ✅ | URLスラッグ（英数字） |
| description | textarea | - | カテゴリ説明 |
| order_num | number | - | 表示順 |

### 5. ハッシュタグ管理（Hashtags）

| 機能 | 説明 |
|------|------|
| 一覧表示 | 名前、スラッグ、使用記事数 |
| 新規作成 | ハッシュタグの追加 |
| 編集 | 名前、スラッグの編集 |
| 削除 | ハッシュタグの削除 |
| 一括削除 | 未使用タグの一括削除 |

### 6. 画像アップロード

| 機能 | 説明 |
|------|------|
| サムネイル | 記事のサムネイル画像アップロード |
| 本文内画像 | Tiptapエディタ内での画像挿入 |
| プレビュー | アップロード前のプレビュー |
| 削除 | 不要な画像の削除 |

#### 画像仕様

| 項目 | 値 |
|------|-----|
| 保存先 | Supabase Storage `thumbnails` バケット |
| パス形式 | `YYYY/MM/filename.ext` |
| 最大サイズ | 5MB |
| 対応形式 | jpg, jpeg, png, webp, gif |

## 非機能要件

### セキュリティ

- Service Role Keyは管理画面のサーバーサイドのみで使用
- ADMIN_PASSWORDは環境変数で管理
- Cookieはhttponly, secure設定

### パフォーマンス

- Server Componentsを活用
- 一覧ページはページネーション対応（20件/ページ）
- 画像は自動リサイズ（将来対応）

### UX

- レスポンシブ対応（PC優先）
- ローディング状態の表示
- エラーメッセージの日本語表示
- 操作完了時のトースト通知

## ディレクトリ構成

```
src/
├── app/
│   └── (admin)/
│       └── admin/
│           ├── layout.tsx              # 管理画面レイアウト
│           ├── page.tsx                # ダッシュボード
│           ├── login/
│           │   └── page.tsx            # ログインページ
│           ├── posts/
│           │   ├── page.tsx            # 記事一覧
│           │   ├── new/
│           │   │   └── page.tsx        # 新規作成
│           │   ├── [id]/
│           │   │   └── page.tsx        # 編集
│           │   ├── actions.ts          # Server Actions
│           │   └── _components/
│           │       ├── PostForm.tsx
│           │       ├── PostList.tsx
│           │       └── PostPreview.tsx
│           ├── categories/
│           │   ├── page.tsx            # カテゴリ一覧
│           │   ├── new/
│           │   │   └── page.tsx        # 新規作成
│           │   ├── [id]/
│           │   │   └── page.tsx        # 編集
│           │   ├── actions.ts          # Server Actions
│           │   └── _components/
│           │       ├── CategoryForm.tsx
│           │       └── CategoryList.tsx
│           └── hashtags/
│               ├── page.tsx            # ハッシュタグ一覧
│               ├── new/
│               │   └── page.tsx        # 新規作成
│               ├── [id]/
│               │   └── page.tsx        # 編集
│               ├── actions.ts          # Server Actions
│               └── _components/
│                   ├── HashtagForm.tsx
│                   └── HashtagList.tsx
├── components/
│   └── admin/
│       ├── Sidebar.tsx                 # サイドバーナビゲーション
│       ├── Header.tsx                  # ヘッダー
│       ├── ScrollToTop.tsx             # ページトップスクロール
│       ├── ImageUploader.tsx           # 画像アップロード
│       └── editor/
│           └── RichTextEditor.tsx      # Tiptapエディタ
├── lib/
│   └── supabase/
│       ├── client.ts                   # クライアント用
│       ├── server.ts                   # サーバー用（RLS適用）
│       └── admin.ts                    # 管理画面用（RLSバイパス）
└── middleware.ts                       # 認証ミドルウェア
```

## 環境変数

```bash
# 既存
NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# 新規追加
ADMIN_PASSWORD=your-secure-password
```

## UI設計

### カラーパレット

管理画面はシンプルなモノトーンベース：
- 背景: `#FAFAFA`（ライトグレー）
- サイドバー: `#1A1A1A`（ダークグレー）
- アクセント: `#FF6B9D`（ブランドカラー）
- 成功: `#22C55E`
- エラー: `#EF4444`

### レイアウト

```
+------------------+--------------------------------+
|                  |  Header (ログアウトボタン)     |
|    Sidebar       +--------------------------------+
|    - Dashboard   |                                |
|    - 記事        |     メインコンテンツ           |
|    - カテゴリ    |                                |
|    - ハッシュタグ|                                |
|                  |                                |
+------------------+--------------------------------+
```

## 実装フェーズ

### Phase 1: 基盤構築
1. shadcn/ui のセットアップ
2. 認証（ログイン/ログアウト）
3. 管理画面レイアウト（Sidebar, Header）
4. Supabase adminクライアント

### Phase 2: 記事管理
1. 記事一覧ページ
2. 記事作成フォーム（基本フィールド）
3. Tiptapエディタ統合
4. 画像アップロード機能
5. 記事編集・削除

### Phase 3: カテゴリ・ハッシュタグ管理
1. カテゴリCRUD
2. ハッシュタグCRUD
3. 記事フォームとの連携

### Phase 4: ダッシュボード・仕上げ
1. ダッシュボード統計
2. 検索・フィルタ機能
3. プレビュー機能
4. エラーハンドリング強化
5. 最終テスト

## 依存パッケージ

```bash
# shadcn/ui
npx shadcn@latest init
npx shadcn@latest add button input textarea label select card badge table dialog alert-dialog dropdown-menu toast tabs checkbox

# Tiptap
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-link @tiptap/extension-placeholder

# Icons
npm install lucide-react
```

## Todo

### Phase 1: 基盤構築 ✅
- [×] shadcn/ui 初期化
- [×] 必要なコンポーネントのインストール
- [×] `src/lib/supabase/admin.ts` 作成（既存のsupabase.tsに統合）
- [×] `src/middleware.ts` 認証ミドルウェア作成
- [×] `src/app/api/admin/login/route.ts` ログインAPI作成
- [×] `src/app/api/admin/logout/route.ts` ログアウトAPI作成
- [×] `src/app/(auth)/admin/login/page.tsx` ログインページ
- [×] `src/app/(admin)/admin/layout.tsx` 管理画面レイアウト
- [×] `src/components/admin/Sidebar.tsx` サイドバー
- [×] `src/components/admin/Header.tsx` ヘッダー
- [×] 環境変数 `ADMIN_PASSWORD` 追加

### Phase 2: 記事管理 ✅
- [×] `src/app/(admin)/admin/posts/page.tsx` 記事一覧
- [×] `src/app/(admin)/admin/posts/actions.ts` Server Actions
- [×] `src/app/(admin)/admin/posts/_components/PostList.tsx`
- [×] `src/app/(admin)/admin/posts/new/page.tsx` 新規作成
- [×] `src/app/(admin)/admin/posts/_components/PostForm.tsx`
- [×] `src/components/admin/editor/RichTextEditor.tsx` Tiptapエディタ
- [×] `src/components/admin/ImageUploader.tsx` 画像アップロード
- [×] `src/app/(admin)/admin/posts/[id]/page.tsx` 編集ページ
- [×] 記事削除機能

### Phase 3: カテゴリ・ハッシュタグ管理 ✅
- [×] `src/app/(admin)/admin/categories/page.tsx` カテゴリ一覧
- [×] `src/app/(admin)/admin/categories/actions.ts`
- [×] `src/app/(admin)/admin/categories/_components/CategoryForm.tsx`
- [×] `src/app/(admin)/admin/categories/_components/CategoryList.tsx`
- [×] `src/app/(admin)/admin/categories/new/page.tsx`
- [×] `src/app/(admin)/admin/categories/[id]/page.tsx`
- [×] `src/app/(admin)/admin/hashtags/page.tsx` ハッシュタグ一覧
- [×] `src/app/(admin)/admin/hashtags/actions.ts`
- [×] `src/app/(admin)/admin/hashtags/_components/HashtagForm.tsx`
- [×] `src/app/(admin)/admin/hashtags/_components/HashtagList.tsx`
- [×] `src/app/(admin)/admin/hashtags/new/page.tsx`
- [×] `src/app/(admin)/admin/hashtags/[id]/page.tsx`

### Phase 4: ダッシュボード・仕上げ ✅
- [×] `src/app/(admin)/admin/page.tsx` ダッシュボード
- [×] 統計表示（記事数、閲覧数）
- [×] 最近の記事・人気記事リスト
- [×] カテゴリ別記事数
- [×] 記事一覧の検索・フィルタ
- [×] プレビュー機能
- [×] トースト通知
- [×] エラーハンドリング
- [ ] 最終テスト・動作確認

## 参考

- [shadcn/ui](https://ui.shadcn.com/)
- [Tiptap Editor](https://tiptap.dev/)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Supabase Storage](https://supabase.com/docs/guides/storage)

---

**作成日**: 2026-01-02
**実装完了日**: 2026-01-02
**ステータス**: 実装完了（最終テスト待ち）
