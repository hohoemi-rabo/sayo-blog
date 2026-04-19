# Ticket 34: IG 取得先アカウント管理（sources CRUD + UI）

> **フェーズ**: Phase 3B 開始
> **依存**: 29（DB + Sidebar）
> **ブロック**: 35（投稿取得）, 36（取得投稿管理）

---

## 概要

Instagram から投稿を取得する対象アカウントを登録・管理する画面 `/admin/instagram/sources` を実装する。
許可状態（未依頼／依頼中／許可済み／拒否）を管理し、許可済みアカウントのみ後続の取得対象とする。
初期 10 件 → 月 5 件追加 の運用を想定。

---

## 実装内容

### 1. API ルート

#### 1.1 `GET /api/admin/instagram/sources`

クエリパラメータ:
- `permission_status` — フィルター（任意）
- `is_active` — フィルター（任意）
- `category_slug` — フィルター（任意）
- `q` — display_name / ig_username の部分一致検索（任意）

レスポンス: `IgSource[]` + totalCount

#### 1.2 `POST /api/admin/instagram/sources`

ボディ: `Omit<IgSource, 'id' | 'created_at' | 'updated_at' | 'last_fetched_at'>`

処理:
- `ig_username` の一意性チェック（重複時 409）
- `@` が含まれる場合は除去して保存
- バリデーション: display_name 必須, permission_status は enum 値

#### 1.3 `PATCH /api/admin/instagram/sources/[id]`

ボディ: `Partial<IgSource>`

処理: 該当行を UPDATE。`ig_username` 変更時は一意性再チェック。

#### 1.4 `DELETE /api/admin/instagram/sources/[id]`

処理:
- `ig_imported_posts` に紐づく取得済み投稿がある場合は、フラグだけチェックして警告付きで削除（CASCADE）
- 紐づく投稿が 0 件なら即削除

### 2. 画面: `/admin/instagram/sources`

**ファイル**: `src/app/(admin)/admin/instagram/sources/page.tsx`

#### 2.1 ヘッダー

- タイトル: 「IG 取得先アカウント管理」
- 「新規登録」ボタン（右上）
- フィルター: 許可状態 / 有効フラグ / カテゴリ / テキスト検索

#### 2.2 アカウント一覧（テーブル形式）

| 列 | 内容 |
|----|------|
| 表示名 | display_name + @ig_username（下段、小文字） |
| カテゴリ | category_slug（バッジ） |
| 許可状態 | バッジ（未依頼=灰 / 依頼中=黄 / 許可済み=緑 / 拒否=赤） |
| 許可日 | permission_date（あれば） |
| 取得設定 | トグル（is_active） |
| 最終取得 | last_fetched_at（相対時刻） |
| アクション | [編集] [今取得] [削除] |

「今取得」ボタンは permission_status='approved' && is_active=true のみ有効。押すと Ticket 35 の取得 API を呼ぶ（本チケットでは UI のみ用意、API は 35 で実装）。

#### 2.3 新規登録 / 編集ダイアログ

フィールド:
- IG ユーザー名（@マーク付き、必須、UNIQUE）
- 表示名（必須）
- カテゴリ（既存 categories からセレクト、任意）
- 許可状態（セレクト、必須）
- 許可日（日付入力、許可状態='approved' の場合のみ表示）
- 許可メモ（テキストエリア、任意）
- 連絡先（テキスト、任意）
- 取得設定（チェックボックス、許可状態='approved' の場合のみ活性）

バリデーション:
- 許可状態が 'approved' 以外のときは `is_active = false` に強制

#### 2.4 削除確認

紐づく `ig_imported_posts` の件数を取得し表示:
「このアカウントに紐づく取得投稿 N 件も削除されます」

### 3. Server Actions

```
src/app/(admin)/admin/instagram/sources/
├── page.tsx
├── actions.ts                   # createSource, updateSource, deleteSource, getSources
└── _components/
    ├── SourcesClient.tsx        # 一覧 + フィルター
    ├── SourceRow.tsx            # テーブル行
    ├── SourceDialog.tsx         # 新規/編集ダイアログ
    └── FetchNowButton.tsx       # 「今取得」ボタン（API 35 呼び出し）
```

### 4. CSV インポート（オプション）

初期 10 件の登録を効率化するため、CSV 一括インポートのフォームを追加することも検討。
本チケットではスコープ外、将来の拡張候補。

### 5. バリデーション

| 項目 | ルール |
|-----|-------|
| ig_username | 半角英数字 + `._` のみ、1-30 文字、先頭の `@` は除去 |
| display_name | 1-100 文字 |
| permission_memo | 最大 1000 文字 |
| category_slug | 既存 categories.slug と一致 |

---

## ファイル構成

```
src/app/api/admin/instagram/sources/
├── route.ts                     # GET / POST
└── [id]/route.ts                # PATCH / DELETE

src/app/(admin)/admin/instagram/sources/
├── page.tsx
├── actions.ts
└── _components/
    ├── SourcesClient.tsx
    ├── SourceRow.tsx
    ├── SourceDialog.tsx
    └── FetchNowButton.tsx
```

---

## 完了条件

- [ ] `GET /api/admin/instagram/sources` が permission_status / is_active / category_slug / q でフィルター可能
- [ ] `POST /api/admin/instagram/sources` で新規登録でき、ig_username の重複は 409 エラー
- [ ] `PATCH /api/admin/instagram/sources/[id]` で全フィールド編集可能
- [ ] `DELETE /api/admin/instagram/sources/[id]` で紐づく取得投稿の件数を警告表示してから削除
- [ ] `/admin/instagram/sources` で一覧が表示される
- [ ] フィルター（許可状態 / 有効 / カテゴリ / 検索）が動作する
- [ ] 新規登録・編集ダイアログで全項目を操作できる
- [ ] 許可状態が 'approved' 以外のとき `is_active` トグルが無効化される
- [ ] 「今取得」ボタンが approved + active のときのみ有効になる（API 呼び出しは 35 で実装）
- [ ] ig_username 入力時に先頭 `@` が自動で除去される
- [ ] `npm run build` が成功する
