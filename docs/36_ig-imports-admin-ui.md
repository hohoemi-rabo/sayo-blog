# Ticket 36: 取得投稿管理画面（/admin/instagram/imports）

> **フェーズ**: Phase 3B
> **依存**: 29（DB）, 34（sources）, 35（取得機能）
> **ブロック**: 37（AI 記事再構成）

---

## 概要

取得済み IG 投稿を一覧・確認・ステータス管理する画面 `/admin/instagram/imports` を実装する。
管理者が各投稿を「記事化する」「スキップ」「未処理に戻す」などのアクションで振り分ける。
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

ボディ: `Partial<{ status }>`（基本的にステータス変更のみ）

処理: 該当行を UPDATE。

#### 1.3 `DELETE /api/admin/instagram/imports/[id]`

処理:
- 関連する Storage 画像（`stored_image_urls`）があれば `ig-imported` バケットから削除
- 行を DELETE
- `generated_post_id` が設定されている場合は削除しない（警告返却）

### 2. 画面: `/admin/instagram/imports`

**ファイル**: `src/app/(admin)/admin/instagram/imports/page.tsx`

#### 2.1 ヘッダー

- タイトル: 「取得投稿一覧」
- フィルター:
  - ステータス（全て / 未処理 / 処理中 / 公開済み / スキップ）
  - アカウント（ig_sources からセレクト）
  - テキスト検索（caption）
  - ソート（最新順 / いいね数順）

#### 2.2 投稿カード一覧（グリッド）

3 列グリッドで表示:

| 要素 | 内容 |
|------|------|
| 画像サムネイル | `image_urls[0]`（外部 URL を直接表示） |
| 投稿者 | `source.display_name` + `@source.ig_username` |
| カテゴリバッジ | `source.category_slug` |
| キャプションプレビュー | 先頭 3 行 + 展開トグル |
| メタ情報 | 投稿日 + いいね数 |
| 元投稿リンク | IG URL を新規タブで開く |
| ステータスバッジ | pending=黄 / processing=青 / published=緑 / skipped=灰 |

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

1. 確認ダイアログ: 「この投稿から記事を生成します。よろしいですか？」
2. `status` を `processing` に変更
3. POST `/api/admin/instagram/imports/[id]/generate` を呼び出し（Ticket 37）
4. 成功レスポンスに `post_id` が含まれる → 記事編集画面へリダイレクト
5. 失敗: Toast エラー + status を `pending` に戻す

Ticket 37 未実装時のフォールバック: API 呼び出し箇所を TODO コメントで明示し、UI 遷移だけ準備しておく。

#### 2.5 画像ギャラリー

投稿に複数画像がある場合、カード上でサムネイル枚数バッジ（例: `🖼 ×3`）を表示。
カードクリック → ダイアログで全画像を閲覧可能（既存の ImageLightbox を応用するか、シンプルなグリッドで表示）。

### 3. ページネーション

検索結果が多い場合を想定し、サーバーサイドページネーション（既存 `Pagination` コンポーネント再利用）を実装。
1 ページあたり 24 件。

### 4. Server Actions

```
src/app/(admin)/admin/instagram/imports/
├── page.tsx
├── actions.ts                    # getImports, updateImportStatus, deleteImport
└── _components/
    ├── ImportsClient.tsx         # フィルター + グリッド
    ├── ImportCard.tsx            # 投稿カード
    ├── ImportImageGallery.tsx    # 複数画像ダイアログ
    └── GenerateArticleButton.tsx # 「記事化する」ボタン
```

### 5. 外部画像の表示

IG 側画像 URL はキャッシュ期限が短いため、失敗時のフォールバック:
- `onError` で placeholder を表示
- 画像が表示できない場合「画像の取得に失敗しました。再取得を推奨」警告

将来的に Storage へ常時保存に切り替える可能性あり（本チケットでは記事化時のみ保存）。

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
    └── GenerateArticleButton.tsx
```

---

## 完了条件

- [ ] `GET /api/admin/instagram/imports` が status / source_id / q / sort でフィルター可能
- [ ] `PATCH /api/admin/instagram/imports/[id]` でステータスを変更できる
- [ ] `DELETE /api/admin/instagram/imports/[id]` で行と関連 Storage 画像が削除される
- [ ] `generated_post_id` がある行は削除できず警告が返る
- [ ] `/admin/instagram/imports` でグリッド一覧が表示される
- [ ] フィルター・ソート・テキスト検索が動作する
- [ ] ページネーション（24 件/ページ）が動作する
- [ ] ステータス別に表示されるアクションボタンが切り替わる
- [ ] 「記事化する」ボタンで status が processing に変更される（API 本体は Ticket 37）
- [ ] 「スキップ」「未処理に戻す」が動作する
- [ ] 複数画像がある投稿ではサムネイル枚数バッジが表示される
- [ ] 元投稿 URL へのリンクが新規タブで開く
- [ ] `npm run build` が成功する
