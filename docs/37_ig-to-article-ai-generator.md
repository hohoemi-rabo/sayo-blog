# Ticket 37: AI 記事再構成（IG→ブログ下書き + 画像保存 + クレジット）

> **フェーズ**: Phase 3B
> **依存**: 29（DB + Storage）, 34（sources）, 35（取得）, 36（imports UI）
> **ブロック**: なし

---

## 概要

取得した IG 投稿（`ig_imported_posts`）をもとに、Gemini がブログ記事の下書き（タイトル・本文 HTML・推奨カテゴリ・推奨ハッシュタグ）を生成する。
同時に画像を Supabase Storage（`ig-imported` バケット）に保存し、記事末尾にクレジット表記と元 IG 投稿へのリンクを自動挿入する。

---

## 実装内容

### 1. プロンプト設計

`src/lib/ig-article-prompt.ts`（新規）:

```typescript
export function buildArticleFromIgPrompt(input: {
  displayName: string
  igUsername: string
  caption: string
  igPostedAt: string
  igPostUrl: string
  categories: Array<{ slug: string; name: string }>  // 既存カテゴリ一覧
}): string
```

プロンプト本文（要件書 9.3 ベース）:
```
あなたは南信州（飯田市・下伊那地域）の地域情報を発信するライター「FUNE」です。

以下の Instagram 投稿をもとに、ブログ記事の下書きを JSON 形式で作成してください。

【ルール】
- FUNE の語り口調（親しみやすく温かみのある文体）
- Instagram 投稿の情報のみを使用し、情報を捏造しない
- 情報量が少ない場合、無理に長い記事にせず「※ここに追加取材の内容を加筆してください」を適切な箇所に挿入する
- 記事末尾にクレジットセクションを含める（下記フォーマット）
- JSON 以外のテキストは出力しない

【出力 JSON スキーマ】
{
  "title": "記事タイトル（15〜40字）",
  "excerpt": "記事抜粋（80〜150字）",
  "content_html": "<p>本文 HTML</p>（Tiptap 互換: p, h2, h3, ul, ol, li, strong, em, a）",
  "recommended_category_slug": "既存カテゴリから1つ",
  "recommended_hashtags": ["タグ1", "タグ2", ...]（5〜10個）
}

【クレジットフォーマット（content_html 末尾に必ず含める）】
<hr>
<p class="credit">
  この記事は <strong>{display_name}</strong> さん（<a href="https://www.instagram.com/{ig_username}/" target="_blank" rel="noopener noreferrer">@{ig_username}</a>）の Instagram 投稿を元に作成しました。<br>
  元投稿: <a href="{ig_post_url}" target="_blank" rel="noopener noreferrer">{ig_post_url}</a>
</p>

【既存カテゴリ一覧】
{categories_list}

【Instagram 投稿データ】
投稿者: {display_name}（@{ig_username}）
投稿日: {ig_posted_at}
キャプション: {caption}
投稿URL: {ig_post_url}
```

### 2. 記事生成ライブラリ

`src/lib/ig-article-generator.ts`（新規）:

```typescript
export async function generateArticleFromIg(importedId: string): Promise<{
  post_id: string
  skipped_reason?: string
}>
```

#### 処理フロー

1. `ig_imported_posts` + `ig_sources` JOIN で取得
2. `status` が `pending` 以外ならスキップ
3. `status = 'processing'` に更新
4. 既存 `categories` 一覧を取得
5. Gemini に JSON 生成を依頼（`buildArticleFromIgPrompt`）
6. JSON パース + バリデーション
7. **画像保存処理**（下記 3 節）
8. **slug 生成**: タイトルを元に unique slug 作成（既存の slug 生成ロジック再利用 or 日本語→romaji→slugify）
9. `posts` に INSERT:
   - `is_published = false`（必ず下書き）
   - `is_featured = false`
   - `published_at = null`
   - `thumbnail_url = stored_image_urls[0]`
   - `content = content_html`（クレジット含む）
10. `post_categories` に推奨カテゴリを INSERT
11. `post_hashtags` に推奨ハッシュタグを INSERT（既存タグは再利用、新規タグは新規作成）
12. `ig_imported_posts` を UPDATE:
    - `status = 'published'`（記事化完了、公開は管理者判断）
    - `generated_post_id = <新記事ID>`
    - `stored_image_urls = [...]`
13. 戻り値: `{ post_id }`

### 3. 画像の Storage 保存

`src/lib/ig-image-storage.ts`（新規）:

```typescript
export async function downloadAndStoreIgImages(
  importedId: string,
  sourceUrls: string[]
): Promise<string[]>
```

処理:
1. 各 `sourceUrls[i]` を fetch（タイムアウト 20 秒）
2. バケット `ig-imported` の `{source_id}/{imported_id}/{i}.jpg` に upload
3. 公開 URL を返す
4. 失敗した画像は除外（全失敗なら throw）

ファイル名は index ベースで統一。

### 4. クレジット表記

プロンプト側で挿入する（上記プロンプト参照）。サーバー側で「必ず含まれているか」を検証し、欠けていれば Post Insert 前に補完する:

```typescript
function ensureCreditSection(html: string, source: IgSource, importedPost: IgImportedPost): string {
  if (html.includes(importedPost.ig_post_url ?? '___NOT_A_URL___')) return html
  return html + buildCreditHtml(source, importedPost)
}
```

### 5. API ルート

#### `POST /api/admin/instagram/imports/[id]/generate`

処理:
1. 認証チェック
2. `generateArticleFromIg(id)` を呼ぶ
3. 成功: `{ post_id, redirect: '/admin/posts/<id>' }` を返す
4. 失敗: エラー詳細 + `status` を `pending` に戻す

**バックグラウンド化**: 生成に 10〜30 秒かかるため、基本は同期レスポンスで OK（maxDuration: 60）。
大量生成時の対策は将来検討。

### 6. slug 生成ロジック

既存に汎用 slug 生成があるか調査の上、なければ以下を実装:

```typescript
// src/lib/slug-utils.ts（既存確認、無ければ新規）
export async function generateUniqueSlug(title: string, sourceHint?: string): Promise<string> {
  // 1. 日本語の場合は romaji 変換 or title から fallback としてランダムサフィックスを付ける
  // 2. ハイフン区切り、英小文字
  // 3. DB に同じ slug があれば -2, -3 のサフィックス
}
```

### 7. UI 連携

Ticket 36 の `GenerateArticleButton.tsx` を実装完了させる:

- クリック → 確認ダイアログ
- POST /api/admin/instagram/imports/[id]/generate
- 成功 → 記事編集画面にリダイレクト（`router.push('/admin/posts/<id>')`）
- 失敗 → Toast エラー

記事編集画面側では Ticket 32 で追加した「元 Instagram 投稿」セクションが表示される。

### 8. エラーハンドリング

| ケース | 対応 |
|-------|------|
| Gemini JSON パース失敗 | 1 回リトライ → 失敗時 status を pending に戻す |
| 画像全取得失敗 | 画像なし（thumbnail_url = null）で記事作成 |
| 既存カテゴリに該当なし | `news` カテゴリで fallback |
| 情報量不足（caption 空 + 画像なし） | 400 返却「記事化に十分な情報がありません」 |
| 記事保存中の DB エラー | トランザクション rollback、status を pending に戻す |

### 9. 記事編集画面での確認項目（操作者向け）

生成された記事は以下を確認してから公開する:
- タイトル・本文の事実確認
- カテゴリ・ハッシュタグの調整
- クレジット表記が含まれているか
- 画像がサムネイルとして設定されているか
- 「※ここに追加取材の内容を加筆してください」の箇所を加筆 or 削除

これらは UI 仕様ではなく運用ガイドラインとして `docs/Phase3-requirements.md` に記載済み。

---

## ファイル構成

```
src/lib/
├── ig-article-prompt.ts          # 新規 - プロンプト生成
├── ig-article-generator.ts       # 新規 - Gemini 呼び出し + DB 保存
├── ig-image-storage.ts           # 新規 - 画像ダウンロード + Storage upload
└── slug-utils.ts                 # 新規または既存 - unique slug 生成

src/app/api/admin/instagram/imports/[id]/generate/
└── route.ts                      # 新規 - POST
```

---

## 完了条件

- [ ] `generateArticleFromIg(id)` が実装され、`posts` に下書き記事を INSERT する
- [ ] `buildArticleFromIgPrompt()` が要件 9.3 準拠のプロンプトを返す
- [ ] Gemini から JSON 形式（title / excerpt / content_html / recommended_category_slug / recommended_hashtags）が返る
- [ ] JSON パース失敗時に 1 回リトライする
- [ ] 画像が `ig-imported/{source_id}/{imported_id}/{i}.jpg` に保存される
- [ ] `stored_image_urls` に公開 URL が保存される
- [ ] 1 枚目の画像が `posts.thumbnail_url` に設定される
- [ ] クレジット表記（display_name + @ig_username + 元 URL）が記事末尾に自動挿入される
- [ ] 推奨カテゴリが `post_categories` に INSERT される
- [ ] 推奨ハッシュタグが `post_hashtags` に INSERT される（新規タグは hashtags に INSERT）
- [ ] `ig_imported_posts.status='published'`, `generated_post_id=<新記事ID>` に更新される
- [ ] 記事は `is_published=false` で作成される（必ず下書き）
- [ ] 「記事化する」ボタン → 生成完了 → 記事編集画面にリダイレクトされる
- [ ] 失敗時に `ig_imported_posts.status` が `pending` に戻される
- [ ] 情報量不足（caption 空 + 画像なし）時は 400 でエラー返却
- [ ] `npm run build` が成功する
