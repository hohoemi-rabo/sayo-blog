# Ticket 30: ブログ→IG AI キャプション生成ロジック

> **フェーズ**: Phase 3A
> **依存**: 29（DB スキーマ + 型 + settings）
> **ブロック**: 31（API）, 32（記事編集画面統合）

---

## 概要

ブログ記事データ（タイトル・抜粋・本文・カテゴリ・ハッシュタグ）を入力として、Instagram 投稿用のキャプション＋ハッシュタグを Gemini で自動生成するコアライブラリを実装する。
単体生成／複数生成（n 件）の両方に対応し、FUNE のトーンと必須ハッシュタグルールを遵守する。

---

## 実装内容

### 1. プロンプト設計

`src/lib/ig-caption-prompt.ts` を新規作成する。

#### 1.1 単体生成プロンプト

```typescript
export function buildSingleCaptionPrompt(input: {
  title: string
  category: string
  excerpt: string | null
  hashtags: string[]
  contentText: string   // HTML をテキスト化したもの
  articleUrl: string
  config: IgCaptionConfig
}): string
```

プロンプト本文（要件書 9.1 を踏襲）:
```
あなたは南信州（飯田市・下伊那地域）の地域情報を発信するライター「FUNE」です。

以下のブログ記事の内容をもとに、Instagram 投稿用のキャプションを生成してください。

【ルール】
- 文字数: {min_length}〜{max_length} 文字
- トーン: FUNE の語り口調（親しみやすく温かみのある文体）
  - 場所・お店の紹介の場合は情報型（住所・営業時間等があれば含める）
- 記事の内容のみを使用し、情報を捏造しない
- 記事へのリンクをキャプション末尾に含める（📍詳しくはブログで\n{article_url}）
- ハッシュタグは含めない（別途処理します）

【ブログ記事データ】
タイトル: {title}
カテゴリ: {category}
抜粋: {excerpt}
記事の既存ハッシュタグ（参考）: {hashtags}
本文: {content_text}
記事URL: {article_url}
```

#### 1.2 複数生成プロンプト

```typescript
export function buildMultiCaptionPrompt(input: {
  title: string
  category: string
  excerpt: string | null
  hashtags: string[]
  contentText: string
  articleUrl: string
  count: number
  config: IgCaptionConfig
}): string
```

単体プロンプトに次の指示を追加:
```
この記事から {count} 件の Instagram 投稿キャプションを生成してください。
各投稿は異なる切り口・視点で作成してください。
  - 1 件目: 記事全体の概要・紹介
  - 2 件目: 特に印象的なエピソードやメニューの深掘り
  - 3 件目: 読者への呼びかけ・来店促進
  （n 件目以降は独自の切り口で）

各キャプションは独立して読めるようにしてください。
```

#### 1.3 ハッシュタグ生成プロンプト

キャプションとは別プロンプトで呼び出す。

```typescript
export function buildHashtagPrompt(input: {
  title: string
  category: string
  contentText: string
  excludeHashtags: string[]   // 必須タグを重複回避
  count: number               // config.generated_hashtag_count
}): string
```

### 2. 生成ライブラリ

`src/lib/ig-caption-generator.ts` を新規作成する。

```typescript
// Gemini 呼び出しラッパー
export async function generateIgCaptions(input: {
  postId: string
  count: number      // 1 以上
}): Promise<GeneratedIgCaption[]>

export interface GeneratedIgCaption {
  caption: string       // 必須ハッシュタグ + 本文 + リンク（末尾ハッシュタグは含めない）
  hashtags: string[]    // 必須 2 件 + 生成 8 件（計 10 件）
  sequence_number: number
}
```

#### 2.1 処理フロー

1. `posts` から id / title / slug / excerpt / content / category / hashtags を取得
2. `ig_settings.caption_config` を読み込み
3. HTML 本文をプレーンテキスト化（既存の article-utils または簡易 strip）
4. 記事 URL を `{NEXT_PUBLIC_SITE_URL}/{category_slug}/{slug}` で生成
5. `count === 1` → 単体プロンプトで Gemini 呼び出し
   `count > 1` → 複数プロンプトで Gemini 呼び出し
6. ハッシュタグ生成を別プロンプトで実行
7. 必須ハッシュタグ（config.required_hashtags）をキャプション冒頭に挿入
8. キャプション末尾に生成ハッシュタグを縦並びで付与
9. 戻り値を整形

#### 2.2 キャプション最終フォーマット

```
#長野県飯田市 #sayosjournalブログ記事

{本文200〜400文字}

📍詳しくはブログで
{記事URL}

#{生成タグ1}
#{生成タグ2}
...
#{生成タグ8}
```

### 3. 既存 Gemini クライアントの活用

`src/lib/gemini.ts` の既存 `gemini-3-flash-preview` モデルを再利用。
新規モデル追加は不要。

### 4. エラーハンドリング

| ケース | 対応 |
|-------|------|
| Gemini API タイムアウト | 指数バックオフで 3 回リトライ |
| 文字数範囲外 | 警告ログ + そのまま返す（UI 側で手動編集前提） |
| ハッシュタグ生成失敗 | 必須タグのみ返す（生成タグ空配列） |
| 記事が存在しない / 非公開 | throw Error('Post not found or not published') |

### 5. 型定義追加

`src/lib/types.ts` に追加:

```typescript
export interface GeneratedIgCaption {
  caption: string
  hashtags: string[]
  sequence_number: number
}
```

---

## ファイル構成

```
src/lib/
├── ig-caption-prompt.ts        # 新規 - プロンプト生成
└── ig-caption-generator.ts     # 新規 - Gemini 呼び出し + 整形
```

---

## 完了条件

- [×] `buildCaptionPrompt`（単体・複数統合 / JSON 一括生成）と `assembleCaptionText` が実装されている
- [×] `generateIgCaptions({ postId, count })` が `GeneratedIgCaption[]` を返す
- [×] 必須ハッシュタグ 2 件がキャプション冒頭に挿入される
- [×] 生成ハッシュタグ 8 件がキャプション末尾に縦並びで付与される
- [×] 合計ハッシュタグ数が 10 件（必須 2 + 生成 8）になる
- [×] 記事 URL がキャプション末尾（ハッシュタグの直前）に含まれる
- [×] `count > 1` で指定件数分の異なる切り口のキャプションが生成される
- [×] Gemini API 失敗時に最大 3 回リトライされる（指数バックオフ）
- [×] `ig_settings.caption_config` の値（min/max_length, required_hashtags, generated_hashtag_count）が反映される
- [×] 公開済み記事のみ生成対象（下書きは拒否）
- [×] 記事 URL は `post_categories` の最初のカテゴリ（order_num 最小）を使用
- [×] `npm run build` が成功する

### 設計判断メモ
- Gemini 呼び出しはキャプション＋ハッシュタグを **1 プロンプト JSON 一括** に統合（仕様書では 2 分離だったが API コール数・コスト・レイテンシ削減のため統合。ユーザー承認済み）
- 必須ハッシュタグと生成ハッシュタグの重複は大文字小文字を無視して自動除去
