# Ticket 20: Phase 2 データベーススキーマ & インフラ

> **優先度**: Phase 2a（最優先）
> **依存**: なし
> **ブロック**: 22, 23, 24, 26, 27, 28

---

## 概要

Phase 2 で必要な 4 つの新規テーブル、pgvector 拡張、RPC 関数、インデックス、RLS ポリシーを作成する。
Phase 2 の全機能の土台となるため、最初に実装する。

---

## 実装内容

### 1. pgvector 拡張の有効化

```sql
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
```

### 2. テーブル作成

#### 2.1 `article_knowledge`

AI ナレッジデータの保存先。記事ごとに 1 レコード。

| カラム | 型 | NULL | デフォルト | 備考 |
|--------|-----|------|-----------|------|
| id | uuid | NO | gen_random_uuid() | PK |
| post_id | uuid | NO | - | FK → posts (CASCADE), UNIQUE |
| slug | text | NO | - | 元記事の slug |
| metadata | jsonb | NO | - | 構造化メタデータ（下記参照） |
| content | text | NO | - | 構造化マークダウン本文 |
| embedding | vector(768) | YES | - | text-embedding-004 のベクトル |
| is_active | boolean | NO | true | AI 検索対象フラグ |
| created_at | timestamptz | NO | now() | |
| updated_at | timestamptz | NO | now() | |

**metadata (jsonb) 構造**:
```json
{
  "title": "記事タイトル",
  "category": "gourmet",
  "hashtags": ["タグ1", "タグ2"],
  "published_at": "2026-01-15",
  "area": "喬木村・阿島地区",
  "summary": "記事の要約（2〜3文）",
  "keywords": ["キーワード1", "キーワード2"],
  "spots": [
    {
      "name": "スポット名",
      "address": "住所",
      "phone": "電話番号",
      "hours": "営業時間",
      "note": "備考"
    }
  ]
}
```

#### 2.2 `ai_prompt_tags`

チャットページに表示するプロンプトタグ。

| カラム | 型 | NULL | デフォルト | 備考 |
|--------|-----|------|-----------|------|
| id | uuid | NO | gen_random_uuid() | PK |
| label | text | NO | - | 表示テキスト |
| prompt | text | NO | - | AI に送信する質問文 |
| tag_type | text | NO | - | purpose / area / scene |
| order_num | integer | NO | 0 | 表示順 |
| is_active | boolean | NO | true | 表示フラグ |
| created_at | timestamptz | NO | now() | |
| updated_at | timestamptz | NO | now() | |

#### 2.3 `ai_usage_logs`

AI チャットの利用ログ。

| カラム | 型 | NULL | デフォルト | 備考 |
|--------|-----|------|-----------|------|
| id | uuid | NO | gen_random_uuid() | PK |
| session_id | text | NO | - | ブラウザ生成の匿名 ID |
| query | text | NO | - | ユーザーの質問 |
| token_input | integer | YES | - | 入力トークン数 |
| token_output | integer | YES | - | 出力トークン数 |
| matched_articles | jsonb | YES | - | ヒットした記事 slug の配列 |
| created_at | timestamptz | NO | now() | |

#### 2.4 `ai_usage_limits`

利用制限の管理。

| カラム | 型 | NULL | デフォルト | 備考 |
|--------|-----|------|-----------|------|
| id | uuid | NO | gen_random_uuid() | PK |
| limit_type | text | NO | - | daily_user / monthly_site |
| limit_value | integer | NO | - | 上限値 |
| current_value | integer | NO | 0 | 現在の使用量 |
| reset_at | timestamptz | YES | - | 次回リセット日時 |
| updated_at | timestamptz | NO | now() | |

### 3. インデックス

| テーブル | インデックス | 種類 |
|----------|------------|------|
| article_knowledge | idx_ak_post_id | btree |
| article_knowledge | idx_ak_slug | btree |
| article_knowledge | idx_ak_embedding | ivfflat (vector_cosine_ops) |
| article_knowledge | idx_ak_is_active | btree |
| ai_prompt_tags | idx_apt_tag_type | btree |
| ai_prompt_tags | idx_apt_order_num | btree |
| ai_usage_logs | idx_aul_session_id | btree |
| ai_usage_logs | idx_aul_created_at | btree DESC |

> **注意**: ivfflat インデックスはデータが投入された後に作成する（空テーブルには作れない）。初回は CREATE INDEX なしで、Ticket 23 の Embedding 一括生成後に作成する。

### 4. RLS ポリシー

| テーブル | 操作 | 条件 |
|----------|------|------|
| article_knowledge | SELECT | `is_active = true` |
| article_knowledge | ALL | `auth.role() = 'authenticated'` |
| ai_prompt_tags | SELECT | `is_active = true` |
| ai_prompt_tags | ALL | `auth.role() = 'authenticated'` |
| ai_usage_logs | INSERT | `true` (匿名書き込み可) |
| ai_usage_logs | SELECT | `auth.role() = 'authenticated'` |
| ai_usage_limits | SELECT | `true` (制限チェック用) |
| ai_usage_limits | ALL | `auth.role() = 'authenticated'` |

### 5. RPC 関数

#### `match_articles(query_embedding vector, match_threshold float, match_count int)`

```sql
-- コサイン類似度でベクトル検索
-- is_active = true の記事のみ対象
-- 類似度スコア付きで返却
RETURNS TABLE (
  id uuid,
  post_id uuid,
  slug text,
  metadata jsonb,
  content text,
  similarity float
)
```

#### `check_usage_limit(p_session_id text)`

```sql
-- 日次ユーザー制限と月次サイト制限をチェック
-- RETURNS jsonb: { allowed, daily_remaining, reason }
```

#### `log_ai_usage(p_session_id, p_query, p_token_input, p_token_output, p_matched_articles)`

```sql
-- ai_usage_logs に INSERT
-- ai_usage_limits の current_value をインクリメント
```

### 6. updated_at トリガー

`article_knowledge`, `ai_prompt_tags`, `ai_usage_limits` に既存の `update_updated_at_column()` トリガーを適用。

### 7. 初期データ投入

`ai_usage_limits` に初期レコードを 2 件挿入:
- `daily_user`: limit_value = 30
- `monthly_site`: limit_value = 10000

### 8. TypeScript 型定義

`src/lib/types.ts` に追加:

```typescript
interface ArticleKnowledge {
  id: string
  post_id: string
  slug: string
  metadata: KnowledgeMetadata
  content: string
  embedding?: number[]
  is_active: boolean
  created_at: string
  updated_at: string
}

interface KnowledgeMetadata {
  title: string
  category: string
  hashtags: string[]
  published_at: string
  area: string
  summary: string
  keywords: string[]
  spots: KnowledgeSpot[]
}

interface KnowledgeSpot {
  name: string
  address?: string
  phone?: string
  hours?: string
  note?: string
}

interface AiPromptTag {
  id: string
  label: string
  prompt: string
  tag_type: 'purpose' | 'area' | 'scene'
  order_num: number
  is_active: boolean
}

interface AiUsageLog {
  id: string
  session_id: string
  query: string
  token_input?: number
  token_output?: number
  matched_articles?: string[]
  created_at: string
}

interface AiUsageLimit {
  id: string
  limit_type: 'daily_user' | 'monthly_site'
  limit_value: number
  current_value: number
  reset_at?: string
  updated_at: string
}
```

---

## 完了条件

- [×] pgvector 拡張が有効化されている
- [×] 4 テーブルが作成され、RLS が有効
- [×] RPC 関数 3 つが作成されている
- [×] インデックスが作成されている（ivfflat 除く）
- [×] 初期データ（ai_usage_limits）が投入されている
- [×] TypeScript 型定義が追加されている
- [×] `npm run build` が成功する
