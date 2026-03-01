# Ticket 28: AI Analytics ダッシュボード

> **優先度**: Phase 2c（運用機能）
> **依存**: 20（DB スキーマ）, 26（利用制限）
> **ブロック**: なし

---

## 概要

管理画面に AI チャットの利用状況とコストを可視化するダッシュボードを実装する。運用時のコスト管理と利用傾向の把握に必要。

---

## 実装内容

### 1. GET /api/ai/usage（認証必須）

**ファイル**: `src/app/api/ai/usage/route.ts`

管理画面用の利用統計 API。認証必須。

**レスポンス**:
```json
{
  "today": {
    "total_queries": 42,
    "total_tokens": 15200,
    "unique_sessions": 18
  },
  "this_month": {
    "total_queries": 850,
    "total_tokens": 312000,
    "unique_sessions": 230,
    "estimated_cost_jpy": 450,
    "daily_breakdown": [
      { "date": "2026-03-01", "queries": 42, "tokens": 15200 },
      { "date": "2026-03-02", "queries": 38, "tokens": 13800 }
    ]
  },
  "limits": {
    "daily_user": { "limit_value": 30 },
    "monthly_site": { "limit_value": 10000, "current_value": 850, "percentage": 8.5 }
  },
  "top_queries": [
    { "query": "飯田市のランチ", "count": 15 },
    { "query": "天龍峡 おすすめ", "count": 12 }
  ]
}
```

**コスト計算ロジック**:
```typescript
// Gemini Flash の推定単価（円、1Mトークンあたり）
// 実際の単価は環境変数で設定可能に
const INPUT_COST_PER_1M = 5    // 入力トークン
const OUTPUT_COST_PER_1M = 15   // 出力トークン

function estimateCostJPY(inputTokens: number, outputTokens: number): number {
  return (inputTokens * INPUT_COST_PER_1M + outputTokens * OUTPUT_COST_PER_1M) / 1_000_000
}
```

### 2. Analytics ページ (`/admin/ai/analytics`)

**レイアウト**: ダッシュボード形式

#### 2.1 統計カード（上部）

4 つの統計カード（既存のダッシュボードと同じスタイル）:

| カード | 値 | アイコン |
|--------|-----|---------|
| 今日の質問数 | today.total_queries | MessageCircle |
| 今月の質問数 | this_month.total_queries | Calendar |
| 今月の推定コスト | this_month.estimated_cost_jpy + "円" | DollarSign |
| 月次制限消費率 | limits.monthly_site.percentage + "%" | Activity |

#### 2.2 日別利用グラフ（中部）

- 棒グラフ or 折れ線グラフ
- X 軸: 日付（当月）
- Y 軸: 質問数
- ホバーでトークン数も表示
- CSS のみで実装 or 軽量ライブラリ（recharts 等）

> **実装判断**: グラフライブラリを追加するかは実装時に判断。CSS のみのシンプルな棒グラフでも可。

#### 2.3 よく聞かれる質問 TOP 10（左下）

テーブル形式:

| 順位 | 質問 | 回数 |
|------|------|------|
| 1 | 飯田市のランチ | 15 |
| 2 | 天龍峡 おすすめ | 12 |
| ... | ... | ... |

- `ai_usage_logs.query` から類似クエリをグルーピング
- 単純な完全一致カウントで開始（将来的に類似度クラスタリングを検討）

#### 2.4 制限管理（右下）

**日次制限**:
- 現在値の表示
- 変更フォーム（数値入力 + 保存ボタン）

**月次制限**:
- 現在値の表示
- プログレスバー（消費率）
- 変更フォーム（数値入力 + 保存ボタン）

**コスト単価設定**（オプション）:
- 入力トークン単価
- 出力トークン単価
- 通貨（JPY）

### 3. Server Actions

**ファイル**: `src/app/(admin)/admin/ai/analytics/actions.ts`

```typescript
// 利用統計の取得
getUsageStats(): Promise<UsageStats>

// よく聞かれる質問の取得
getTopQueries(limit?: number): Promise<TopQuery[]>

// 日別の利用データ
getDailyBreakdown(month?: string): Promise<DailyBreakdown[]>

// 制限値の更新
updateLimit(limitType: 'daily_user' | 'monthly_site', value: number): Promise<void>
```

### 4. SQL クエリ例

**今日の統計**:
```sql
SELECT
  COUNT(*) as total_queries,
  COALESCE(SUM(token_input), 0) + COALESCE(SUM(token_output), 0) as total_tokens,
  COUNT(DISTINCT session_id) as unique_sessions
FROM ai_usage_logs
WHERE created_at >= (now() AT TIME ZONE 'Asia/Tokyo')::date AT TIME ZONE 'Asia/Tokyo';
```

**今月の日別集計**:
```sql
SELECT
  (created_at AT TIME ZONE 'Asia/Tokyo')::date as date,
  COUNT(*) as queries,
  COALESCE(SUM(token_input), 0) + COALESCE(SUM(token_output), 0) as tokens
FROM ai_usage_logs
WHERE created_at >= date_trunc('month', now() AT TIME ZONE 'Asia/Tokyo') AT TIME ZONE 'Asia/Tokyo'
GROUP BY 1
ORDER BY 1;
```

**TOP 10 クエリ**:
```sql
SELECT query, COUNT(*) as count
FROM ai_usage_logs
WHERE created_at >= date_trunc('month', now() AT TIME ZONE 'Asia/Tokyo') AT TIME ZONE 'Asia/Tokyo'
GROUP BY query
ORDER BY count DESC
LIMIT 10;
```

---

## ファイル構成

```
src/app/(admin)/admin/ai/analytics/
├── page.tsx                    # ダッシュボードページ
├── actions.ts                  # Server Actions
└── _components/
    ├── StatsCards.tsx           # 統計カード (4枚)
    ├── UsageChart.tsx           # 日別利用グラフ
    ├── TopQueries.tsx           # よく聞かれる質問 TOP10
    └── LimitSettings.tsx        # 制限値管理フォーム

src/app/api/ai/usage/route.ts   # 利用統計 API
```

---

## 完了条件

- [×] GET /api/ai/usage が統計データを返す（認証必須）→ Server Actions で実装（API route 不要）
- [×] Analytics ページに統計カード 4 枚が表示される
- [×] 日別利用グラフが表示される
- [×] よく聞かれる質問 TOP 10 が表示される
- [×] 制限値の変更が管理画面からできる
- [×] 推定コスト（円）が正しく計算される
- [×] `npm run build` が成功する
