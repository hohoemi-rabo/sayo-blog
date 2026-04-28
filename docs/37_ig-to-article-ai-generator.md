# Ticket 37: AI 記事再構成（IG→ブログ下書き + イベント情報抽出 + クレジット）

> **フェーズ**: Phase 3B
> **依存**: 29（DB + Storage）, 34（sources）, 35（CSV 取り込み）, 36（imports UI + 画像選択）
> **ブロック**: なし

---

## 概要

取り込み済み IG 投稿（`ig_imported_posts`）をもとに、Gemini がブログ記事の下書き
（タイトル・本文 HTML・推奨カテゴリ・推奨ハッシュタグ・**イベント情報の構造化抽出**）を生成する。

本フェーズの主目的は **飯田下伊那のイベント情報を sayo-blog で一元的に閲覧できるようにする**こと。
そのため、AI はキャプション中の「開催日・会場・料金・申込方法」などを構造化して抽出し、
記事カード上で日付・会場が大きく見やすく表示できるよう、`posts` テーブルにイベント用カラムを追加する。

画像は Ticket 35 で既に Supabase Storage に保存済みなので、本チケットでは画像ダウンロード処理は不要。
Ticket 36 の画像選択ダイアログで `selected_image_indexes` に保存された配列を参照し、選ばれた画像のみを記事に埋め込む。

---

## 実装内容

### 1. DB スキーマ変更

`posts` テーブルにイベント用カラムを追加:

```sql
ALTER TABLE posts
  ADD COLUMN is_event boolean NOT NULL DEFAULT false,
  ADD COLUMN event_date_start date,
  ADD COLUMN event_date_end date,
  ADD COLUMN event_time_start text,        -- "10:00" 等の自由記述
  ADD COLUMN event_time_end text,          -- "16:00" 等
  ADD COLUMN event_venue text,
  ADD COLUMN event_address text,
  ADD COLUMN event_fee text,               -- "無料" / "500円" / "大人 1000円・子供 500円" 等
  ADD COLUMN event_url text;               -- 公式サイトや申込フォーム URL（あれば）

-- イベント記事の絞り込み高速化
CREATE INDEX idx_posts_event_date_partial
  ON posts (event_date_start) WHERE is_event = true;
```

すべて nullable（`is_event` のみ default false）。
- `event_date_start` / `event_date_end` は DATE 型（時刻なし、ISO `YYYY-MM-DD`）
- `event_time_start` / `event_time_end` は text（「10:00〜16:00」のような曖昧表記も許容）
- `event_fee` は text（「無料」「500円」等の自由表記）

将来 `/[category]/page.tsx` のカード表示で、`is_event = true` の場合は日付バッジを大きく表示する想定（実装は本チケットスコープ外）。

### 2. プロンプト設計

`src/lib/ig-article-prompt.ts`（新規）:

```typescript
export function buildArticleFromIgPrompt(input: {
  displayName: string
  igUsername: string
  caption: string
  igPostedAt: string
  igPostUrl: string
  imageCount: number              // 採用画像枚数（selected_image_indexes.length）
  categories: Array<{ slug: string; name: string }>  // 既存カテゴリ一覧
}): string
```

プロンプト本文（要点）:
```
あなたは南信州（飯田市・下伊那地域）の地域情報を発信するライター「FUNE」です。

以下の Instagram 投稿をもとに、ブログ記事の下書きを JSON 形式で作成してください。
本ブログは「飯田下伊那のイベント情報を一元的に届ける」ことを目的としているため、
キャプション中の開催日・会場・料金などのイベント情報を構造化して抽出してください。

【ルール】
- FUNE の語り口調（親しみやすく温かみのある文体）
- Instagram 投稿の情報のみを使用し、情報を捏造しない
- 情報量が少ない場合、無理に長い記事にせず「※ここに追加取材の内容を加筆してください」を適切な箇所に挿入
- 本文 HTML はセクション構造（h2 見出し → 説明）で書く（IG 投稿生成と同じルール、Phase 3A の運用に合わせる）
- 記事末尾にクレジットセクションを含める（下記フォーマット）
- JSON 以外のテキストは出力しない

【イベント情報の抽出ルール】
キャプション中に開催日・会場が含まれていればイベント記事として扱い、is_event=true、関連フィールドを埋める。
含まれていない（普通の紹介投稿）なら is_event=false で関連フィールドはすべて null。

- event_date_start / event_date_end: ISO 形式 YYYY-MM-DD
  - 単日開催 → start のみ、end は null
  - 複数日開催（例: 3/22-23） → start と end 両方
  - 「来月」「今度の土曜」など相対表記しかない場合 → null（追記が必要なため）
  - 「毎週土曜」など定期開催 → null + extraction_note にメモ
- event_time_start / event_time_end: 自由記述 ("10:00", "10時〜")
- event_venue: 会場名（例: "飯田りんご並木"）
- event_address: 住所（あれば）
- event_fee: 料金（"無料", "500円", "大人 1000円・子供 500円" 等の自由表記）
- event_url: 公式サイトや申込フォームの URL（キャプション中にあれば）
- extraction_note: 抽出に関する補足（曖昧な日付など、人間がレビューで参照）

【出力 JSON スキーマ】
{
  "title": "記事タイトル（15〜40字、イベントなら【日付】や【飯田市】等の修飾を含めて良い）",
  "excerpt": "記事抜粋（80〜150字）",
  "content_html": "<h2>...</h2><p>...</p>（Tiptap 互換: h2, h3, p, ul, ol, li, strong, em, a）",
  "recommended_category_slug": "既存カテゴリから1つ（イベントなら 'event' 推奨）",
  "recommended_hashtags": ["タグ1", "タグ2", ...]（5〜10個、# なし）,
  "event": {
    "is_event": true | false,
    "event_date_start": "YYYY-MM-DD" | null,
    "event_date_end": "YYYY-MM-DD" | null,
    "event_time_start": "10:00" | null,
    "event_time_end": "16:00" | null,
    "event_venue": "..." | null,
    "event_address": "..." | null,
    "event_fee": "..." | null,
    "event_url": "https://..." | null,
    "extraction_note": "曖昧な日付の場合のメモ" | null
  }
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
画像枚数: {image_count}（記事内には採用された画像のみが配置される）
キャプション: {caption}
投稿URL: {ig_post_url}
```

### 3. 記事生成ライブラリ

`src/lib/ig-article-generator.ts`（新規）:

```typescript
export async function generateArticleFromIg(importedId: string): Promise<{
  post_id: string
  is_event: boolean
}>
```

#### 処理フロー

1. `ig_imported_posts` + `ig_sources` JOIN で取得
2. `status` が `pending` 以外ならスキップ
3. `status = 'processing'` に更新
4. 既存 `categories` 一覧を取得
5. **採用画像 URL の抽出**:
   - `selected_image_indexes` が null なら `stored_image_urls` 全部を採用
   - そうでなければ `selected_image_indexes` でフィルタリング
   - 結果を `articleImageUrls: string[]` として保持
6. Gemini に JSON 生成を依頼（`buildArticleFromIgPrompt`）
7. JSON パース + バリデーション（イベント情報含む）
8. **クレジット表記の検証**: `ig_post_url` が含まれていなければサーバー側で補完
9. **slug 生成**: タイトルを元に unique slug 作成（既存ロジック or romaji 変換）
10. **本文 HTML への画像挿入**:
    - h2 セクションが複数ある場合は「画像 1 枚目を最初の h2 直後」、複数あれば順次挿入
    - 単純に 1 枚なら冒頭、複数なら h2 の数に合わせて配分
    - 仕様詳細は下記 5 節
11. `posts` に INSERT:
    - `is_published = false`（必ず下書き）
    - `is_featured = false`
    - `published_at = null`
    - `thumbnail_url = articleImageUrls[0] ?? null`
    - `content = content_html`（クレジット + 画像埋め込み済み）
    - `is_event = event.is_event`
    - `event_date_start` 〜 `event_url` を埋める（is_event = false なら null）
12. `post_categories` に推奨カテゴリを INSERT
13. `post_hashtags` に推奨ハッシュタグを INSERT（既存タグは再利用、新規タグは新規作成）
14. `ig_imported_posts` を UPDATE:
    - `status = 'published'`（記事化完了、公開は管理者判断）
    - `generated_post_id = <新記事ID>`
15. 戻り値: `{ post_id, is_event }`

### 4. 画像処理（Ticket 35 との分担）

**Ticket 35 で完了済み**:
- Cowork 取り込み時に全画像を `ig-imported/{ig_username}/{post_id}_{N}.{ext}` に保存
- `stored_image_urls` に公開 URL の配列が格納されている

**本チケットでやること**:
- `selected_image_indexes` で絞り込んだ URL を本文 HTML に挿入するだけ
- 画像のダウンロード・Storage アップロードは行わない（既存）
- `posts.thumbnail_url` には採用画像の 1 枚目を設定

`src/lib/ig-image-storage.ts` は不要になる（Ticket 35 の `ig-import-storage.ts` で完結）。

### 5. 本文 HTML への画像埋め込みルール

Gemini が出力した `content_html` は h2 セクションで分割されている前提（プロンプトで指示）。
採用画像は以下のルールで挿入する:

- **採用画像 1 枚**: 最初の `<h2>` の直後に挿入
- **採用画像 N 枚かつ h2 が M 個** (N <= M): 各 h2 の直後に 1 枚ずつ順番に
- **採用画像 N 枚かつ h2 が M 個** (N > M): 余った画像は最後の h2 セクションの末尾に追加
- **h2 が 0 個**: 本文の先頭に全画像を縦並びで配置

挿入する画像 HTML:
```html
<img class="max-w-full h-auto rounded-lg" src="{image_url}">
```
（既存 Tiptap 出力と同じ形式）

実装: `src/lib/ig-article-images.ts`（新規）に `injectImagesIntoArticle(html, imageUrls)` を切り出す。

### 6. クレジット表記

プロンプト側で挿入する（上記プロンプト参照）。サーバー側で「必ず含まれているか」を検証し、欠けていれば Post Insert 前に補完:

```typescript
function ensureCreditSection(html: string, source: IgSource, importedPost: IgImportedPost): string {
  if (importedPost.ig_post_url && html.includes(importedPost.ig_post_url)) return html
  return html + buildCreditHtml(source, importedPost)
}
```

### 7. API ルート

#### `POST /api/admin/instagram/imports/[id]/generate`

処理:
1. 認証チェック（`assertAdminAuth`）
2. `generateArticleFromIg(id)` を呼ぶ
3. 成功: `{ post_id, is_event, redirect: '/admin/posts/<id>' }` を返す
4. 失敗: エラー詳細 + `status` を `pending` に戻す

**バックグラウンド化**: 生成に 10〜30 秒かかるため、基本は同期レスポンスで OK（`maxDuration: 60`）。
大量生成時の対策は将来検討。

### 8. slug 生成ロジック

既存に汎用 slug 生成があるか調査の上、なければ以下を実装:

```typescript
// src/lib/slug-utils.ts（既存確認、無ければ新規）
export async function generateUniqueSlug(title: string, sourceHint?: string): Promise<string> {
  // 1. 日本語の場合は romaji 変換 or title から fallback としてランダムサフィックスを付ける
  // 2. ハイフン区切り、英小文字
  // 3. DB に同じ slug があれば -2, -3 のサフィックス
}
```

イベント記事の場合は `event-{YYYY-MM-DD}-{slugified-title}` のように日付プレフィックス付きを優先。

### 9. UI 連携

Ticket 36 の `GenerateArticleButton.tsx` を本チケットで完成させる:

- クリック → 画像選択ダイアログ（Ticket 36 で実装）
- 選択完了 → 確認ダイアログ
- POST `/api/admin/instagram/imports/[id]/generate`
- 成功 → 記事編集画面にリダイレクト
- 失敗 → Toast エラー

記事編集画面（既存）にイベント情報の編集 UI も追加が必要:
- イベント開催日（date 入力 × 2）
- 開催時刻（text 入力 × 2）
- 会場・住所・料金・URL（text 入力）
- 「これはイベント記事」チェックボックス（is_event）

→ 編集 UI は本チケットの範囲。`src/app/(admin)/admin/posts/[id]/_components/EventInfoSection.tsx` 新規。

### 10. エラーハンドリング

| ケース | 対応 |
|-------|------|
| Gemini JSON パース失敗 | 1 回リトライ → 失敗時 status を pending に戻す |
| イベント情報の日付が不正（例: "来月"） | event_date_start = null + extraction_note に保存、is_event=true でも保存可 |
| 既存カテゴリに該当なし | `news` カテゴリで fallback |
| 採用画像 0 枚（selected_image_indexes が空配列） | 400 返却「採用画像を 1 枚以上選択してください」 |
| 情報量不足（caption 空 + 画像なし） | 400 返却「記事化に十分な情報がありません」 |
| 記事保存中の DB エラー | status を pending に戻す |

### 11. 記事編集画面での確認項目（運用ガイドライン）

生成された記事は以下を確認してから公開する:
- タイトル・本文の事実確認
- イベント日付・会場・料金の正確性（特に extraction_note があれば必ず確認）
- カテゴリ・ハッシュタグの調整
- クレジット表記が含まれているか
- 画像がサムネイルとして設定されているか
- 「※ここに追加取材の内容を加筆してください」の箇所を加筆 or 削除

紗代さんは原則ここで内容を確認・修正してから公開する。
詳細は `docs/Phase3-requirements.md` の運用フロー節に追記。

---

## ファイル構成

```
src/lib/
├── ig-article-prompt.ts          # 新規 - プロンプト生成
├── ig-article-generator.ts       # 新規 - Gemini 呼び出し + DB 保存
├── ig-article-images.ts          # 新規 - 画像挿入ロジック
└── slug-utils.ts                 # 新規または既存 - unique slug 生成

src/app/api/admin/instagram/imports/[id]/generate/
└── route.ts                      # 新規 - POST

src/app/(admin)/admin/posts/[id]/_components/
└── EventInfoSection.tsx          # 新規 - イベント情報編集 UI

supabase/migrations/
└── 20260430_add_posts_event_columns.sql  # is_event 等 8 カラム追加
```

---

## 完了条件

- [ ] `posts` テーブルに `is_event` / `event_date_start` / `event_date_end` / `event_time_start` / `event_time_end` / `event_venue` / `event_address` / `event_fee` / `event_url` カラムが追加されている
- [ ] `idx_posts_event_date_partial` インデックスが作成されている
- [ ] `generateArticleFromIg(id)` が実装され、`posts` に下書き記事を INSERT する
- [ ] `buildArticleFromIgPrompt()` がイベント情報抽出を含むプロンプトを返す
- [ ] Gemini から JSON 形式（title / excerpt / content_html / recommended_category_slug / recommended_hashtags / event）が返る
- [ ] イベント情報が `posts` の event_* カラムに保存される
- [ ] 曖昧な日付（「来月」等）の場合は event_date_start = null + extraction_note 付きで保存される
- [ ] JSON パース失敗時に 1 回リトライする
- [ ] `selected_image_indexes` で絞り込んだ画像のみが本文 HTML に埋め込まれる
- [ ] 1 枚目の画像が `posts.thumbnail_url` に設定される
- [ ] 画像挿入は h2 セクションごとに分配される（h2 が 1 個なら冒頭、複数なら順次）
- [ ] クレジット表記（display_name + @ig_username + 元 URL）が記事末尾に自動挿入される（欠けていればサーバー側で補完）
- [ ] 推奨カテゴリが `post_categories` に INSERT される
- [ ] 推奨ハッシュタグが `post_hashtags` に INSERT される（新規タグは hashtags に INSERT）
- [ ] `ig_imported_posts.status='published'`, `generated_post_id=<新記事ID>` に更新される
- [ ] 記事は `is_published=false` で作成される（必ず下書き）
- [ ] 「記事化する」ボタン → 生成完了 → 記事編集画面にリダイレクトされる
- [ ] 失敗時に `ig_imported_posts.status` が `pending` に戻される
- [ ] 採用画像 0 枚 / 情報量不足の場合は 400 でエラー返却
- [ ] 記事編集画面に EventInfoSection が追加され、イベント情報を編集できる
- [ ] `npm run build` が成功する
