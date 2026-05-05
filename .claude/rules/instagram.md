---
paths:
  - "src/lib/ig-*"
  - "src/lib/post-sections*"
  - "src/app/(admin)/admin/instagram/**"
  - "src/app/api/admin/instagram/**"
  - "src/app/api/instagram/**"
---

# Instagram Integration Rules (Phase 3)

## Blog Article Authoring Rule (IMPORTANT)

Instagram 連携する記事は必ず **セクション構造** で書く。自由記述は禁止。

### 必須構造
```html
<h2>見出し 1</h2>
<img src="...">  (※推奨: セクションごとに代表画像)
<p>本文...</p>

<h2>見出し 2</h2>
<img src="...">
<p>本文...</p>
```

### 運用ルール
- 1 セクション = 1 Instagram 投稿 (カルーセルではなく単一投稿)
- `<h2>` ごとに記事が論理的に分割される
- セクション内の **最初の `<img>`** が IG 投稿画像として採用される
- 画像がないセクションは記事サムネイルが fallback で使われる (警告表示)
- `<h2>` が 1 つもない記事は IG 投稿生成できない (エラー返却)

既存記事も IG 投稿する場合は事前にこの構造に修正する。

## Caption vs Hashtags Data Model

`ig_posts` テーブルには 2 つのフィールドが重複保存されている:
- `caption` (text) — IG に実際に投稿される完成形テキスト (必須タグ冒頭 + 本文 + URL + 生成タグ末尾)
- `hashtags` (text[]) — 管理用メタデータ配列 (検索・フィルター用、IG には送らない)

**編集画面では `caption` のみを編集する**。`updateIgPost` で caption を更新すると、
正規表現 `#[^\s#]+` で自動抽出して `hashtags` 配列が同期更新される
(`actions.ts` の `extractHashtagsFromCaption`)。

→ **編集ダイアログに別々のハッシュタグチップ UI を置かない**こと (昔あったが、
データ不整合と UX 混乱の原因になったので撤去済み)。

## Caption Generation Pipeline (Phase 3A: ブログ → IG)

```
1. generateIgCaptions({ postId, sectionIndexes })
2. parsePostSections(content) で h2 単位に分割
3. 各セクションごとに buildCaptionPrompt (sectionHeading 指定) で Gemini 呼び出し
4. sanitizeCaptionBody で Gemini が残した禁止事項を除去
   (必須タグ / 記事URL / 「詳しくはブログで」 / タイトル行)
5. assembleCaptionText で最終フォーマットに組み立て
```

### サニタイザの役割
Gemini は指示を無視することがあるので、後処理で強制除去する:
- `line.includes(articleTitle)` でタイトル含有行を検出
- `【xxx】` で始まる短い見出し風行 (40 文字以下 + 句点なし) を検出
- 記事 URL の全バリエーション (localhost/本番ドメイン/http/https)
- 必須ハッシュタグの正確なテキストマッチ

## Article Generation Pipeline (Phase 3B: IG → ブログ, Ticket 37)

```
1. generateArticleFromIg(importedId)
2. ig_imported_posts + ig_sources を JOIN 取得 (status=pending/processing のみ可)
3. status='processing' に更新 (冪等)
4. selected_image_indexes で stored_image_urls を絞り込み (空なら 0 枚エラー)
5. buildArticleFromIgPrompt で Gemini に JSON 生成依頼 (3 回リトライ + markdown fences 除去)
6. recommended_category_slug 解決 → 不明なら news fallback
7. ensureCreditSection で ig_post_url 含有チェック → 欠損なら末尾自動補完
8. injectImagesIntoArticle で h2 セクションに画像配分 (N≤M なら 1 枚ずつ、N>M なら最後集約)
9. generateUniquePostSlug で slug 生成 (event 記事は event-{date}-{title} 優先)
10. posts INSERT (is_published=false 強制, event_* カラム埋め)
11. post_categories / post_hashtags INSERT (新規ハッシュタグは hashtags にも INSERT)
12. ig_imported_posts UPDATE (status=published, generated_post_id=新記事 ID)
13. 失敗時は status=pending に rollbackToPending で巻き戻し
```

### 関連ファイル
- `src/lib/ig-article-prompt.ts` — buildArticleFromIgPrompt (FUNE persona + JSON スキーマ + イベント抽出ルール)
- `src/lib/ig-article-generator.ts` — generateArticleFromIg + IgArticleValidationError
- `src/lib/ig-article-credit.ts` — buildCreditHtml / ensureCreditSection
- `src/lib/ig-article-images.ts` — injectImagesIntoArticle
- `src/lib/slug-utils.ts` — slugifyTitle / generateUniquePostSlug

### イベント情報抽出ルール
プロンプトで `event` ネスト JSON (is_event, event_date_start..end, event_time_*, venue, address, fee, url, extraction_note) を要求。
- `event_date_start` は `^\d{4}-\d{2}-\d{2}$` 正規表現で検証 → 不一致は null
- 「来月」「毎週土曜」など曖昧表記は null + extraction_note に記録 (console.warn)
- is_event=false なら event 以下すべて null に正規化

### エントリポイント
- Server Action: `imports/actions.ts` の `startGenerateArticle(id, indexes)` → 直接 `generateArticleFromIg` を await
- API ルート: `POST /api/admin/instagram/imports/[id]/generate` (maxDuration=60)

両者で同じ generator を共有し、status=pending チェックで二重生成を防止。

## Storage Buckets

| Bucket | 用途 |
|--------|------|
| `ig-posts` | ブログ→IG 方向の投稿画像 (オーバーレイテキスト入り等、将来拡張用) |
| `ig-imported` | IG→ブログ方向の取得画像 (Phase 3B) |

`IgPost.image_url` が `ig-posts` バケットのパブリック URL を含む場合、
削除時に Storage からも消す (`actions.ts` の `deleteStorageObjectIfOwned`)。
他のバケット (`thumbnails` 等) の URL は触らない。

## Transient Error Handling

Supabase は Cloudflare 経由のため、一時的な 502/503/504 が発生する。
すべての mutation は `withRetry()` でラップする:
- 最大 3 回リトライ (指数バックオフ: 500ms → 1s → 2s)
- HTML エラー応答 (`<!DOCTYPE`) やタイムアウトを transient と判定
- バリデーションエラー (NOT NULL 違反等) は即座に返却、リトライしない

エラーメッセージは `friendlyDbError()` で整形:
- HTML 応答 → "サーバーが一時的に応答しませんでした。数秒後にもう一度..."
- 200 文字超のメッセージは末尾省略

## Known Issues

### `'use server'` ファイルの同期 export 禁止
`actions.ts` のような `'use server'` 指定ファイルは **async 関数しか export できない**。
同期ヘルパーは別ファイルに分離する (例: `filters.ts` の `parseIgPostStatus`)。

### Supabase JOIN の型揺れ
`post_categories(categories(...))` のような JOIN で、Supabase の返す型は
`categories` を配列 or 単体オブジェクトの両方扱いする。
`RawPostRow` 型で `T | T[] | null` を受け、`flatMap` で正規化する。

### Post.thumbnail_url の型ミスマッチ
DB 上は `text NULL` (→ TS で `string | null`) だが、
`Post` interface は `thumbnail_url?: string` (`string | undefined`) になっている。
`IgPostWithRelations.post` に渡す時は `?? undefined` で明示的に変換。
