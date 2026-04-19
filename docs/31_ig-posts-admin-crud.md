# Ticket 31: IG 投稿管理 CRUD（API + 管理画面 UI）

> **フェーズ**: Phase 3A
> **依存**: 29（DB + Sidebar）, 30（キャプション生成）
> **ブロック**: 32（自動下書き生成統合）, 33（Graph API 直接投稿）

---

## 概要

Instagram 下書きを管理するための API ルート群と、管理画面 `/admin/instagram/posts` を実装する。
下書きの一覧表示・編集・削除・追加生成・ステータス変更（手動投稿済みマーク / コピー完了）をサポートする。
Graph API 直接投稿は Ticket 33 で扱う（本チケットはコピー＋手動投稿済みマークまで）。

---

## 実装内容

### 1. API ルート

#### 1.1 `GET /api/admin/instagram/posts`

クエリパラメータ:
- `status` — `draft` / `published` / `manual_published` / `all`（省略時 all）
- `post_id` — 特定記事に紐づく下書きのみ
- `limit`, `offset` — ページネーション

レスポンス: `IgPostWithRelations[]` + totalCount

記事 JOIN（title / slug / thumbnail_url）は `select('*, post:posts(id, title, slug, thumbnail_url)')` で取得。

#### 1.2 `POST /api/admin/instagram/posts`

ボディ: `{ post_id: string, count: number }`

処理:
1. 認証チェック（`admin_auth` cookie）
2. `generateIgCaptions(post_id, count)` で下書き生成（Ticket 30）
3. `sequence_number` は既存の最大値 + 1 から採番
4. `ig_posts` に INSERT（status = 'draft'）
5. 作成された下書き配列を返す

#### 1.3 `PATCH /api/admin/instagram/posts/[id]`

ボディ: `Partial<{ caption, hashtags, status, image_url, sequence_number }>`

処理: 該当行を UPDATE。status 変更時は `instagram_published_at` を同時更新（manual_published の場合は now()）。

#### 1.4 `DELETE /api/admin/instagram/posts/[id]`

処理: 該当行を DELETE。関連 Storage 画像（`image_url`）も `ig-posts` バケットから削除。

#### 1.5 `POST /api/admin/instagram/generate`

明示的な「追加生成」専用エンドポイント（1.2 とロジック共通だが UI からの呼び出しを分離して明示）。
本チケットでは 1.2 にエイリアスでも OK。

### 2. 画面: `/admin/instagram/posts`

**ファイル**: `src/app/(admin)/admin/instagram/posts/page.tsx`

#### 2.1 レンダリング

- `force-dynamic`（フィルター searchParams 使用）
- Server Component で初期データ取得 → Client Component に渡す

#### 2.2 ヘッダー

- タイトル: 「Instagram 下書き管理」
- 記事フィルター: 記事選択ドロップダウン（post_id）
- ステータスフィルター: 全て / 下書き / 投稿済み / 手動投稿済み
- 「追加生成」ボタン: 記事選択 + 件数入力 → POST /api/admin/instagram/posts

#### 2.3 下書きカード一覧

各カードに以下を表示:

| 要素 | 内容 |
|------|------|
| サムネイル | 元記事の `thumbnail_url` |
| 連番バッジ | `{sequence_number}/{同記事内の総数}` |
| ステータスバッジ | draft=灰 / published=緑 / manual_published=青 |
| 元記事タイトル | post.title + リンク |
| キャプションプレビュー | 最初の 2 行 + ...（展開トグルあり） |
| ハッシュタグプレビュー | 最初の 5 件 + ... |
| 作成日 | created_at |

アクションボタン:
- 📋 **コピー** — キャプション全文 + ハッシュタグを clipboard.writeText で一括コピー
- 🖼️ **画像ダウンロード** — `image_url` があればダウンロード（なければ元記事サムネイル）
- ✅ **手動投稿済み** — status を `manual_published` に変更
- ✏️ **編集** — 編集ダイアログ表示
- 🗑️ **削除** — 確認ダイアログ → DELETE

※ 「📷 Instagram に投稿」ボタン（Graph API 直接投稿）は Ticket 33 で追加する。

#### 2.4 編集ダイアログ

React Portal + Dialog コンポーネント（既存の `ui/Dialog`）を利用。

編集可能項目:
- caption（Textarea、文字数カウンター付き）
- hashtags（HashtagInput 類似の入力、1 個ずつ追加／削除）
- image_url（MediaPickerDialog + アップロード。空にするとリセット）

保存ボタン → PATCH /api/admin/instagram/posts/[id] → Toast 表示 → 一覧リロード。

#### 2.5 Toast 通知

既存の `ToastProvider` を利用:
- コピー成功: 「キャプションをコピーしました」
- 手動投稿済みマーク: 「手動投稿済みに変更しました」
- 編集保存: 「下書きを更新しました」
- 削除: 「下書きを削除しました」

### 3. Server Actions（推奨）

既存の AI Analytics ページが Server Actions 方式を採用しているため、本ページも Server Actions を主とし、Client Component からの mutation 用に API ルートも提供する。

```
src/app/(admin)/admin/instagram/posts/
├── page.tsx                    # Server Component (データ取得)
├── actions.ts                  # Server Actions (updateIgPost, deleteIgPost, generateIgPosts)
└── _components/
    ├── IgPostsClient.tsx       # Client Component (フィルター + 一覧)
    ├── IgPostCard.tsx          # 個別カード
    ├── IgPostEditDialog.tsx    # 編集ダイアログ
    └── GenerateDialog.tsx      # 追加生成ダイアログ
```

### 4. 画像ハンドリング

| ケース | 扱い |
|-------|------|
| image_url が null | 元記事の thumbnail_url を使用（カード表示・DL・コピー時） |
| image_url が設定済み | Storage の `ig-posts` バケット上の画像を使用 |

画像の比率調整（要件 3.5）: 現時点では「拡大縮小で全体を収める」= CSS `object-contain`。
Graph API 投稿用のサーバー側クロップ処理は Ticket 33 で扱う（本チケットでは URL のみ管理）。

### 5. セキュリティ

全 API ルートで `admin_auth` cookie 検証を実施（既存の admin API と同じパターン）。
未認証時は 401 返却。

---

## ファイル構成

```
src/app/api/admin/instagram/
├── posts/
│   ├── route.ts               # GET / POST
│   └── [id]/route.ts          # PATCH / DELETE
└── generate/route.ts          # POST (追加生成エイリアス)

src/app/(admin)/admin/instagram/posts/
├── page.tsx
├── actions.ts
└── _components/
    ├── IgPostsClient.tsx
    ├── IgPostCard.tsx
    ├── IgPostEditDialog.tsx
    └── GenerateDialog.tsx
```

---

## 完了条件

- [ ] `GET /api/admin/instagram/posts` が status / post_id フィルターで絞り込み可能
- [ ] `POST /api/admin/instagram/posts` で指定件数の下書きが生成され INSERT される
- [ ] `PATCH /api/admin/instagram/posts/[id]` で caption / hashtags / status / image_url が更新される
- [ ] `DELETE /api/admin/instagram/posts/[id]` で行と Storage 画像が削除される
- [ ] `/admin/instagram/posts` で下書き一覧が表示される
- [ ] ステータスフィルター・記事フィルターが動作する
- [ ] 「追加生成」ダイアログで記事選択 + 件数指定 → 下書きが作成される
- [ ] コピー・画像ダウンロード・手動投稿済み・編集・削除の各アクションが動作する
- [ ] 編集ダイアログで caption / hashtags / image_url が編集・保存できる
- [ ] 全 API が未認証時に 401 を返す
- [ ] `npm run build` が成功する
