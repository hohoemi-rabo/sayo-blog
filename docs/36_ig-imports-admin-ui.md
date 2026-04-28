# Ticket 36: 取得投稿管理画面（/admin/instagram/imports）

> **フェーズ**: Phase 3B
> **依存**: 29（DB）, 34（sources）, 35（CSV 取り込み）
> **ブロック**: 37（AI 記事再構成）

---

## 概要

取り込み済み IG 投稿を一覧・確認・ステータス管理する画面 `/admin/instagram/imports` を実装する。
管理者が各投稿を「記事化する」「スキップ」「未処理に戻す」などのアクションで振り分ける。
カルーセル投稿（複数画像）は、記事化に使う画像をチェックボックスで選択できる。
AI 記事生成ボタンは本チケットで配置するが、生成ロジック本体は Ticket 37 で実装する（本チケットでは UI のみ）。

---

## 実装内容

### 1. API ルート

#### 1.1 `GET /api/admin/instagram/imports`

クエリパラメータ:
- `status` — `pending` / `processing` / `published` / `skipped` / `all`
- `source_id` — 特定アカウントの投稿のみ
- `q` — caption の部分一致検索
- `sort` — `latest` (ig_posted_at DESC, default) / `likes` (likes_count DESC)
- `limit`, `offset`

レスポンス: `IgImportedPostWithSource[]` + totalCount

JOIN: `select('*, source:ig_sources(ig_username, display_name, category_slug), post:posts(id, title, slug)')`

#### 1.2 `PATCH /api/admin/instagram/imports/[id]`

ボディ: `Partial<{ status, selected_image_indexes }>`

処理: 該当行を UPDATE。
- `status`: `pending` / `processing` / `published` / `skipped`
- `selected_image_indexes`: 記事化に使う画像のインデックス配列（0-origin）。例 `[0, 2]` = 1 枚目と 3 枚目を採用。Null は全採用。

#### 1.3 `DELETE /api/admin/instagram/imports/[id]`

処理:
- 関連する Storage 画像（`stored_image_urls`）があれば `ig-imported` バケットから削除
- 行を DELETE
- `generated_post_id` が設定されている場合は削除しない（警告返却）

### 2. 画面: `/admin/instagram/imports`

**ファイル**: `src/app/(admin)/admin/instagram/imports/page.tsx`

#### 2.1 ヘッダー

- タイトル: 「取り込み投稿一覧」
- 右上に **[📥 新規取り込み]** ボタン（`/admin/instagram/imports/upload` へ遷移、Ticket 35）
- フィルター:
  - ステータス（全て / 未処理 / 処理中 / 公開済み / スキップ）
  - アカウント（ig_sources からセレクト）
  - テキスト検索（caption）
  - ソート（最新順 / いいね数順）

#### 2.2 投稿カード一覧（グリッド）

3 列グリッドで表示:

| 要素 | 内容 |
|------|------|
| 画像サムネイル | `stored_image_urls[0]`（Supabase Storage 経由） |
| 投稿者 | `source.display_name` + `@source.ig_username` |
| カテゴリバッジ | `source.category_slug` |
| キャプションプレビュー | 先頭 3 行 + 展開トグル |
| メタ情報 | 投稿日 + いいね数 + コメント数 |
| 元投稿リンク | IG URL（`ig_post_url`）を新規タブで開く |
| ステータスバッジ | pending=黄 / processing=青 / published=緑 / skipped=灰 |
| 画像枚数バッジ | カルーセル投稿は `🖼 ×N` 表示 |

#### 2.3 アクションボタン

各カードに状態別ボタン:

| status | ボタン |
|--------|-------|
| pending | [🤖 記事化する] [⏭️ スキップ] [🗑️ 削除] |
| processing | [📝 生成中の記事を開く] [↩️ 未処理に戻す] |
| published | [📄 生成記事を見る] |
| skipped | [↩️ 未処理に戻す] [🗑️ 削除] |

#### 2.4 「記事化する」ボタンの動作

本チケットでは以下の暫定実装とする（実際の AI 生成は Ticket 37 で実装）:

1. **画像選択ダイアログ表示**（複数画像がある場合のみ、下記 2.5 参照）
2. 選択した画像インデックスを `selected_image_indexes` として PATCH で保存
3. 確認ダイアログ: 「この投稿から記事を生成します。よろしいですか？」
4. `status` を `processing` に変更
5. POST `/api/admin/instagram/imports/[id]/generate` を呼び出し（Ticket 37）
6. 成功レスポンスに `post_id` が含まれる → 記事編集画面へリダイレクト
7. 失敗: Toast エラー + status を `pending` に戻す

単一画像の場合は画像選択ダイアログをスキップし、`selected_image_indexes = [0]` で進む。

Ticket 37 未実装時のフォールバック: API 呼び出し箇所を TODO コメントで明示し、UI 遷移だけ準備しておく（`selected_image_indexes` の保存ロジックは本チケットで完成させる）。

#### 2.5 画像選択ダイアログ（カルーセル投稿用）

複数画像がある投稿で「記事化する」を押した時に表示:

```
┌─────────────────────────────────────────┐
│ 記事化に使う画像を選んでください            │
├─────────────────────────────────────────┤
│ ☑ [🖼 1]  ☑ [🖼 2]  ☐ [🖼 3]            │
│ ☑ [🖼 4]  ☐ [🖼 5]                       │
│                                          │
│ ※ クリックで選択 / 解除                   │
│ ※ 表示順は IG 投稿の順番が保持されます      │
├─────────────────────────────────────────┤
│              [キャンセル] [次へ →]        │
└─────────────────────────────────────────┘
```

実装: `ImageSelectorDialog.tsx` を新規作成。
- 各画像をサムネイル + チェックボックスで表示
- 1 枚以上選択必須（全部解除はバリデーションエラー）
- 「次へ」で `selected_image_indexes` を確定し、確認ダイアログへ進む

#### 2.6 画像ギャラリー（閲覧専用）

投稿カードクリック → ダイアログで全画像を閲覧可能（既存の ImageLightbox を応用するか、シンプルなグリッドで表示）。
こちらは閲覧のみで、画像選択 UI とは別物。

### 3. ページネーション

検索結果が多い場合を想定し、サーバーサイドページネーション（既存 `Pagination` コンポーネント再利用）を実装。
1 ページあたり 24 件。

### 4. Server Actions

```
src/app/(admin)/admin/instagram/imports/
├── page.tsx
├── actions.ts                    # getImports, updateImportStatus, updateSelectedImages, deleteImport
└── _components/
    ├── ImportsClient.tsx         # フィルター + グリッド
    ├── ImportCard.tsx            # 投稿カード
    ├── ImportImageGallery.tsx    # 複数画像ダイアログ（閲覧用）
    ├── ImageSelectorDialog.tsx   # 画像選択ダイアログ（記事化用）
    └── GenerateArticleButton.tsx # 「記事化する」ボタン
```

### 5. 画像表示

`stored_image_urls` は Cowork 取り込み時（Ticket 35）にすべて Supabase Storage（`ig-imported` バケット）に保存済みのため、外部 URL のキャッシュ期限切れ問題は発生しない。常に安定して表示できる。

### 6. 一括操作（任意）

将来拡張として以下を検討（本チケットでは実装しない）:
- 複数選択 → 一括スキップ
- 複数選択 → 一括削除

---

## ファイル構成

```
src/app/api/admin/instagram/imports/
├── route.ts                      # GET
└── [id]/route.ts                 # PATCH / DELETE

src/app/(admin)/admin/instagram/imports/
├── page.tsx
├── actions.ts
└── _components/
    ├── ImportsClient.tsx
    ├── ImportCard.tsx
    ├── ImportImageGallery.tsx
    ├── ImageSelectorDialog.tsx
    └── GenerateArticleButton.tsx
```

---

## 完了条件

- [ ] `GET /api/admin/instagram/imports` が status / source_id / q / sort でフィルター可能
- [ ] `PATCH /api/admin/instagram/imports/[id]` で status と selected_image_indexes を変更できる
- [ ] `DELETE /api/admin/instagram/imports/[id]` で行と関連 Storage 画像が削除される
- [ ] `generated_post_id` がある行は削除できず警告が返る
- [ ] `/admin/instagram/imports` でグリッド一覧が表示される
- [ ] 右上に「📥 新規取り込み」ボタンがあり、`/admin/instagram/imports/upload` へ遷移する
- [ ] フィルター・ソート・テキスト検索が動作する
- [ ] ページネーション（24 件/ページ）が動作する
- [ ] ステータス別に表示されるアクションボタンが切り替わる
- [ ] 複数画像がある投稿で「記事化する」を押すと画像選択ダイアログが表示される
- [ ] 画像選択 → 1 枚以上選択必須のバリデーションが動作する
- [ ] 選択結果が selected_image_indexes として DB に保存される
- [ ] 単一画像の投稿ではダイアログをスキップして直接記事化に進む
- [ ] 「記事化する」ボタンで status が processing に変更される（生成 API 本体は Ticket 37）
- [ ] 「スキップ」「未処理に戻す」が動作する
- [ ] 複数画像がある投稿ではサムネイル枚数バッジが表示される
- [ ] 元投稿 URL へのリンクが新規タブで開く
- [ ] `npm run build` が成功する
