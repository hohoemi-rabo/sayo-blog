# Ticket 23: ナレッジ生成 & Embedding パイプライン

> **優先度**: Phase 2a（最優先）
> **依存**: 20（DB スキーマ）, 22（Admin CRUD）
> **ブロック**: 24

---

## 概要

既存の記事 HTML から AI を使ってナレッジデータ（構造化マークダウン + メタデータ）を自動生成し、Embedding ベクトルを生成・保存する。初回 50 記事の一括処理と、個別記事の生成・再生成の両方に対応する。

---

## 実装内容

### 1. パッケージ追加

```bash
npm install @google/generative-ai
```

### 2. Gemini クライアント

**ファイル**: `src/lib/gemini.ts`

```typescript
// Gemini API クライアントのシングルトン
// 環境変数: GEMINI_API_KEY, GEMINI_MODEL, EMBEDDING_MODEL
```

- チャット用モデル（GEMINI_MODEL）と Embedding 用モデル（EMBEDDING_MODEL）を分離
- エラーハンドリング（API キー未設定、レート制限等）

### 3. ナレッジ生成ロジック

**ファイル**: `src/lib/knowledge-generator.ts`

#### 3.1 記事 HTML → ナレッジデータ変換

```typescript
async function generateKnowledge(article: {
  title: string
  content: string  // HTML
  excerpt?: string
  category: string
  hashtags: string[]
  published_at: string
}): Promise<{
  metadata: KnowledgeMetadata
  content: string  // マークダウン
}>
```

**Gemini への指示**:
- 記事の HTML をマークダウンに変換
- メタデータを抽出（area, summary, keywords, spots）
- FUNEの語り口が活きるような構造化
- スポット情報（名前、住所、電話番号等）を構造化
- 不要な HTML タグ・装飾を除去

**プロンプト設計のポイント**:
- 記事のタイトル、カテゴリ、タグは入力として渡す（推測させない）
- area はナレッジ生成時に AI が記事内容から推定
- spots は住所・電話番号パターンから抽出
- summary は記事の要約（2〜3 文）
- keywords は検索に使えるキーワード（5〜10 個）

#### 3.2 Embedding 生成

```typescript
async function generateEmbedding(text: string): Promise<number[]>
```

- `text-embedding-004` (768 次元) を使用
- 入力テキスト: `metadata.title + " " + metadata.summary + " " + content` の結合
- 入力トークン上限に注意（必要に応じて切り詰め）

### 4. 一括生成 API

**ファイル**: `src/app/api/admin/ai/knowledge/generate/route.ts`

```
POST /api/admin/ai/knowledge/generate
```

**リクエスト**:
```json
{
  "post_ids": ["uuid1", "uuid2", ...],  // 空の場合は全記事
  "regenerate_embedding": true           // Embedding も再生成するか
}
```

**処理フロー**:
1. 認証チェック
2. 対象記事を取得
3. 各記事に対して順次（レート制限考慮）:
   a. `generateKnowledge()` でナレッジデータ生成
   b. `generateEmbedding()` で Embedding 生成
   c. `article_knowledge` に UPSERT
4. 進捗をレスポンスに含める

**レート制限対策**:
- 1 記事ごとに 1〜2 秒の待機
- バッチサイズの設定（一度に処理する記事数）
- エラー時のリトライ（最大 3 回、指数バックオフ）

**レスポンス**: SSE (Server-Sent Events) で進捗を返す

```
event: progress
data: { "current": 5, "total": 50, "title": "処理中の記事タイトル" }

event: complete
data: { "success": 45, "failed": 5, "errors": [...] }
```

### 5. 個別ナレッジ生成

**管理画面からの呼び出し** (Ticket 22 の KnowledgeForm に統合):

- 「AI で下書き生成」ボタン
- 元記事を Gemini に送信 → メタデータ + コンテンツのフォームに反映
- ライターが確認・修正 → 保存

### 6. 保存時の Embedding 自動再生成

Ticket 22 の `updateKnowledge()` を拡張:

- ナレッジデータ保存時に Embedding を自動再生成
- 非同期で処理（保存は即座に完了、Embedding は裏で生成）
- Embedding 生成失敗時はログに記録し、embedding カラムは NULL のまま

### 7. ivfflat インデックス作成

一括生成完了後に ivfflat インデックスを作成:

```sql
CREATE INDEX idx_ak_embedding ON article_knowledge
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);
```

> lists の値はデータ数に応じて調整（推奨: sqrt(行数)）。50 記事なら lists = 7〜10。

### 8. 管理画面 UI の更新

**一覧ページの「一括生成」ボタン** (Ticket 22 で UI のみ作成済み):
- クリック → 確認ダイアログ（"50記事分のナレッジデータを AI で生成します。数分かかる場合があります。"）
- 進捗表示（プログレスバー + 現在処理中の記事タイトル）
- 完了通知（成功/失敗件数）

**編集ページの「AI で下書き生成」ボタン**:
- 新規作成時のみ表示
- クリック → 元記事を AI で解析 → フォームに反映
- 既存データがある場合は上書き確認

---

## 環境変数

```bash
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3-flash-preview
EMBEDDING_MODEL=text-embedding-004
```

---

## エラーハンドリング

| エラー | 対処 |
|--------|------|
| API キー未設定 | 管理画面に設定案内を表示 |
| レート制限 | 待機後にリトライ（指数バックオフ） |
| 生成結果の JSON パースエラー | リトライ、ダメならスキップ |
| Embedding 生成失敗 | ナレッジデータは保存、embedding は NULL |
| 入力テキストが長すぎる | 切り詰めて処理 |

---

## 完了条件

- [ ] `@google/generative-ai` がインストールされている
- [ ] Gemini クライアントが作成されている
- [ ] 記事 HTML → ナレッジデータの自動生成ができる
- [ ] Embedding の生成・保存ができる
- [ ] 一括生成が進捗表示付きで動作する
- [ ] 個別の AI 下書き生成が動作する
- [ ] 保存時に Embedding が自動再生成される
- [ ] ivfflat インデックスが作成されている
- [ ] `npm run build` が成功する
