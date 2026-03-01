# Ticket 24: AI チャット API（ベクトル検索 + Gemini + SSE ストリーミング）

> **優先度**: Phase 2a（最優先）
> **依存**: 20（DB スキーマ）, 23（Embedding パイプライン）
> **ブロック**: 25, 26

---

## 概要

AI チャットのバックエンド API を実装する。ユーザーの質問を Embedding 化 → ベクトル検索でナレッジを取得 → Gemini にコンテキスト付きで送信 → ストリーミングでレスポンスを返す。

---

## 実装内容

### 1. POST /api/ai/chat

**ファイル**: `src/app/api/ai/chat/route.ts`

**リクエスト**:
```typescript
interface ChatRequest {
  message: string        // ユーザーの質問
  session_id: string     // ブラウザ生成の匿名 UUID
  history: Array<{       // 過去の会話履歴
    role: 'user' | 'assistant'
    content: string
  }>
}
```

**レスポンス形式**: `text/event-stream` (Server-Sent Events)

**ストリーミングイベント**:

```typescript
// テキスト（逐次送信）
{ type: 'text', content: '回答テキストの一部...' }

// 関連記事（ストリーミング完了後）
{ type: 'articles', content: [
  { slug: 'xxx', title: '...', thumbnail_url: '...', excerpt: '...', category: '...' }
]}

// スポット情報（ストリーミング完了後）
{ type: 'spots', content: [
  { name: '...', address: '...', phone: '...', hours: '...', mapUrl: '...' }
]}

// 関連タグ提案（ストリーミング完了後）
{ type: 'suggestions', content: ['ラベル1', 'ラベル2'] }

// 完了
{ type: 'done', content: '' }

// エラー
{ type: 'error', content: 'エラーメッセージ' }
```

### 2. 処理フロー

```
1. リクエスト検証
   └─ message, session_id の存在チェック

2. 利用制限チェック
   └─ check_usage_limit RPC（Ticket 26 で本格実装、ここではスケルトン）
   └─ 制限超過時: { type: 'error', content: '...' } を返して終了

3. ユーザーの質問を Embedding 化
   └─ text-embedding-004 で 768 次元ベクトルに変換

4. ベクトル検索
   └─ match_articles RPC で関連記事を取得（上位 2〜5 件）
   └─ 類似度スコアの閾値で動的に件数を調整
   └─ ヒットなしの場合: 対応範囲外メッセージ用のフラグを立てる

5. システムプロンプト + コンテキスト構築
   └─ FUNE の人格定義
   └─ ヒットしたナレッジデータ（metadata + content）
   └─ 回答フォーマットの指示

6. Gemini にストリーミングリクエスト
   └─ システムプロンプト + 会話履歴 + 質問 を送信
   └─ generateContentStream() を使用

7. SSE でクライアントに転送
   └─ テキストチャンクを逐次 { type: 'text' } で送信

8. ストリーミング完了後
   └─ 関連記事のカード情報を { type: 'articles' } で送信
   └─ スポット情報を { type: 'spots' } で送信
   └─ 関連タグ提案を { type: 'suggestions' } で送信
   └─ { type: 'done' } を送信

9. 使用ログ記録（非同期）
   └─ log_ai_usage RPC（session_id, query, tokens, matched_articles）
```

### 3. システムプロンプト

**ファイル**: `src/lib/ai-prompts.ts`

```typescript
const SYSTEM_PROMPT = `
あなたは「FUNE」です。...
（詳細は要件定義書 セクション 4.2 参照）

## 回答のルール
- 必ずナレッジデータに基づいて回答する
- ナレッジにない情報は推測せず、正直に伝える
- 飯田市・下伊那郡エリア以外の質問は対応範囲外と伝える
- 回答にはできるだけ記事への言及を含める
- スポット情報がある場合は住所・電話番号を含める
- 回答は簡潔に、読みやすく

## 回答フォーマット
- マークダウン形式で回答する
- 記事への言及は [[slug]] 形式で埋め込む（後処理でカードに変換）
- スポット情報は {{spot:スポット名}} 形式で埋め込む（後処理でカードに変換）
`
```

> **注意**: システムプロンプトの具体的な文面は実装時に調整する。ここでは構造と方針のみ定義。

### 4. コンテキスト構築

**ナレッジデータのフォーマット**:

```typescript
function formatKnowledgeContext(articles: ArticleKnowledge[]): string {
  return articles.map(a => `
---
記事: ${a.metadata.title}
カテゴリ: ${a.metadata.category}
エリア: ${a.metadata.area}
要約: ${a.metadata.summary}
${a.metadata.spots?.length ? `スポット情報:\n${formatSpots(a.metadata.spots)}` : ''}

${a.content}
---
  `).join('\n')
}
```

### 5. 会話履歴の管理

- クライアントから送られる `history` 配列をそのまま Gemini に渡す
- コンテキストウィンドウの上限を考慮:
  - history が長い場合は古い会話を切り捨て
  - 最新 N ターン（例: 10 ターン）のみ使用
  - ナレッジデータ + システムプロンプトが優先

### 6. 後処理（ストリーミング完了後）

Gemini の回答テキストから:

1. `[[slug]]` パターンを抽出 → 対応する記事の情報を DB から取得 → `{ type: 'articles' }` イベントで送信
2. `{{spot:スポット名}}` パターンを抽出 → ナレッジの spots から情報取得 → `{ type: 'spots' }` イベントで送信
3. 関連タグの提案 → ai_prompt_tags から関連するタグを取得 → `{ type: 'suggestions' }` イベントで送信

### 7. Runtime 設定

```typescript
export const runtime = 'nodejs'  // Edge Runtime も検討可
export const maxDuration = 30    // Vercel の制限内
```

> **Vercel の制約**: Free プランは 10 秒、Pro は 60 秒。ストリーミングの場合はレスポンス開始から計測されるため、初期レスポンスの速さが重要。

---

## エラーハンドリング

| エラー | 対処 |
|--------|------|
| Gemini API タイムアウト | `{ type: 'error' }` でフォールバックメッセージ |
| Gemini API エラー | `{ type: 'error' }` でフォールバックメッセージ |
| Embedding 生成失敗 | キーワード検索にフォールバック（将来拡張） |
| ベクトル検索ヒットなし | FUNE の人格で「見つからなかった」メッセージ |
| 不正なリクエスト | 400 エラー |

---

## セキュリティ

- API キーはサーバーサイドのみ（`GEMINI_API_KEY` は `NEXT_PUBLIC_` なし）
- session_id はクライアント生成の UUID（個人情報を含まない）
- ユーザー入力のサニタイズ（プロンプトインジェクション対策）
- レスポンスに DB の内部 ID を含めない

---

## 完了条件

- [ ] POST /api/ai/chat が SSE ストリーミングでレスポンスを返す
- [ ] ユーザーの質問が Embedding 化される
- [ ] ベクトル検索でナレッジデータが取得される
- [ ] Gemini がナレッジデータを参照して FUNE の人格で回答する
- [ ] 関連記事・スポット情報が後処理で送信される
- [ ] 会話履歴が正しくコンテキストに含まれる
- [ ] エラー時にフォールバックメッセージが返される
- [ ] 使用ログが記録される
- [ ] `npm run build` が成功する
