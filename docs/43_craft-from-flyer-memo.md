# Ticket 43: 記事クラフト（チラシ / メモ → 記事）

## 概要

紗代さんが「チラシの写真」や「取材メモ」から、**紗代さん本人の文体を保ったまま**記事の下書きを
AI に作らせる機能。生成物は下書き（`article_type='free'`, `is_published=false`）として保存され、
既存の記事編集画面（Tiptap）で自由に編集・写真挿入・公開できる。

「文章にこだわっている」という要望を受け、公開中の 96 記事を精読して
**文体プロファイル**（`docs/writing-style-profile.md`）を作成。これを生成の芯に据える。

## 方針・決定事項（ヒアリング結果）

- **モデル**: `gemini-3-flash-preview` のまま（ネイティブでマルチモーダル。画像/PDF を読める）。
- **入力**: チラシ（画像/PDF・vision で読み取り）＋ メモ（テキスト）の両対応。チラシは読み取り専用で記事には載せない。
- **文体の担保**: ハイブリッド。
  1. `docs/writing-style-profile.md`（固定の文体プロファイル。正本・人が編集可）を毎回プロンプトに差し込む。
  2. 題材が近い自由記事を全 96 件から 2〜3 本自動選択し、few-shot の「お手本」として渡す
     （記事本体に埋め込みが無く、`article_knowledge` の埋め込みは 27/96 しか無いため、
      埋め込みではなく カテゴリ＋キーワード重なり で選ぶ）。
- **出力**: 通常記事（h2 セクション構造・■ 付き見出し・読みやすい改行）。
- **写真**: 今回は自動配置しない（次フェーズ）。生成本文に `<img>` は入れず、編集画面で人が挿入する。
- **導線**: `/admin/posts`「新規作成」→ 3 枚カードの選択画面（📄チラシから / 📝メモから / ✍️自分で書く）。
- **保存後**: 既存の `/admin/posts/[id]` 編集画面へリダイレクト。

## 生成フロー（2 パス）

1. **抽出パス（vision）** `buildCraftExtractPrompt` — チラシ画像/PDF + メモを忠実に読み取り、
   `{category_slug, keywords, organized_facts}` に整理（捏造禁止）。
2. **お手本選定** `selectStyleExamples` — カテゴリ＋キーワードで題材が近い自由記事を 2〜3 本。
3. **執筆パス** `buildCraftArticlePrompt` — 文体プロファイル + お手本 + 整理済みの事実で
   FUNE の語り口の通常記事を生成（`IgArticleAiOutput` 互換 JSON）。
4. **保存** — `posts`（free / 下書き）へ INSERT → カテゴリ / ハッシュタグ紐付け → `/admin/posts/[id]` へ。

## 捏造しない仕組み（重要）

- 素材（チラシ・メモ）に無い体験・感想・会話・数値は書かない。
- 情報が薄いセクションには `※ここに実際の取材・体験の内容を加筆してください` を挿入。
- お手本記事から具体的な事実（料金・駐車場条件など）を持ち込まないよう明示。
- 最終的な事実確認・仕上げは紗代さん本人の編集に委ねる（下書きで保存される）。

## 追加/変更ファイル

- `docs/writing-style-profile.md` — 文体プロファイル（正本・人が編集可）
- `src/lib/writing-style.ts` — 上記 md を runtime 読み込み（キャッシュ + フォールバック）
- `next.config.ts` — `outputFileTracingIncludes` で md を関数バンドルへ同梱
- `src/lib/craft-inputs.ts` — 入力制約（accept mime / 10MB / 最大 4 枚）
- `src/lib/craft-example-selector.ts` — お手本記事の自動選定
- `src/lib/craft-article-prompt.ts` — 抽出 / 執筆プロンプト + 抽出結果パーサ
- `src/lib/craft-article-generator.ts` — 生成本体（2 パス + 下書き保存）
- `src/lib/article-ai-shared.ts` — `callGeminiParsed`（汎用）/ `callGeminiForArticleParts`（vision）/ `parseJsonLoose` を追加
- `src/app/api/admin/posts/craft/route.ts` — 生成 API（multipart, `maxDuration=60`）
- `src/app/(admin)/admin/posts/create/page.tsx` — 3 枚カードの選択画面
- `src/app/(admin)/admin/posts/craft/page.tsx` — クラフト画面（force-dynamic, `?mode=flyer|memo`）
- `src/app/(admin)/admin/posts/craft/_components/CraftForm.tsx` — 入力フォーム
- `src/app/(admin)/admin/posts/page.tsx` — 「新規作成」を選択画面へ導線変更

DB マイグレーションなし（既存 posts に保存）。

## 完了条件

- [×] 96 記事を精読し文体プロファイル `docs/writing-style-profile.md` を作成（紗代さんレビュー済み）
- [×] Gemini vision 配線（`callGeminiForArticleParts` / `callGeminiParsed`）
- [×] お手本記事の自動選定（全 96 件対象・カテゴリ＋キーワード）
- [×] 2 パス生成（抽出 → 執筆）で FUNE 文体の通常記事（h2 構造）を生成
- [×] 下書き（free）として保存し編集画面へリダイレクト
- [×] 3 枚カードの選択画面 + クラフト画面 + フォーム
- [×] `npm run lint` / `npm run build` パス
- [×] メモ入力での実生成を確認（捏造プレースホルダが機能・`<img>` なし・h2 構造・基本情報ブロック）
- [ ] チラシ画像/PDF での実生成を本番環境で確認（vision, ローカルは GEMINI_API_KEY を Next 文脈で要）
- [ ] （次フェーズ）写真の自動配置

## 既知の注意点

- お手本の事実混入: プロンプトで抑制しているが、「飯田の市営駐車場は 2 時間まで無料」等の
  一般に流布した情報を補うことがある。下書きレビューで確認する前提。
- 生成本文に画像は入らない（設計通り）。写真は編集画面で挿入。
- チラシ/PDF は API へ multipart 送信（vision に base64 で渡す）。ストレージには保存しない（読み取り専用）。
