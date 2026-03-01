# Ticket 26: 利用制限 & エラーハンドリング

> **優先度**: Phase 2b（安定化）
> **依存**: 24（Chat API）, 25（Chat UI）
> **ブロック**: 28

---

## 概要

AI チャットの利用制限（日次ユーザー / 月次サイト）とエラーハンドリング（API 障害 / タイムアウト）を実装する。コスト管理の安全弁として不可欠な機能。

---

## 実装内容

### 1. ユーザー日次制限

**識別方法**: `localStorage` に保存した匿名 `session_id` (UUID)

| 項目 | 値 |
|------|-----|
| 制限 | 1 ユーザー 1 日あたり N 回（初期値: 30） |
| リセット | 毎日 0:00 JST |
| 制限値の変更 | 管理画面から（ai_usage_limits テーブル） |

**実装方式**:

1. クライアントが `/api/ai/chat` にリクエスト
2. サーバー側で `check_usage_limit(session_id)` RPC を呼び出す
3. `ai_usage_logs` テーブルから当日の session_id のレコード数をカウント
4. `ai_usage_limits` の `daily_user.limit_value` と比較
5. 制限超過 → `{ type: 'error', content: '制限メッセージ' }` を返す

**制限到達時のメッセージ** (FUNE の人格):

> 今日はたくさんお話しましたね！また明日お気軽に聞いてください。ブログページからも記事を探せますよ。

+ `/blog` へのリンクボタン

### 2. サイト月次上限（セーフティネット）

| 項目 | 値 |
|------|-----|
| 制限 | 月間の総 API 呼び出し回数（初期値: 10,000） |
| リセット | 毎月 1 日 0:00 JST |
| 制限値の変更 | 管理画面から |

**実装方式**:

1. `check_usage_limit` RPC で月次制限もチェック
2. `ai_usage_logs` テーブルから当月の全レコード数をカウント
3. `ai_usage_limits` の `monthly_site.limit_value` と比較

**上限到達時**:
- 入力欄を無効化（`disabled`）
- メッセージ: 「ただいまメンテナンス中です。ブログページから記事をお探しください。」
- `/blog` へのリンクボタン
- ブログページ、記事詳細、検索は通常通り動作

### 3. check_usage_limit RPC の実装

Ticket 20 でスケルトンを作成した RPC を本格実装:

```sql
CREATE OR REPLACE FUNCTION check_usage_limit(p_session_id text)
RETURNS jsonb AS $$
DECLARE
  v_daily_limit integer;
  v_daily_count integer;
  v_monthly_limit integer;
  v_monthly_count integer;
  v_today date := (now() AT TIME ZONE 'Asia/Tokyo')::date;
  v_month_start timestamptz;
BEGIN
  -- 日次制限値を取得
  SELECT limit_value INTO v_daily_limit
  FROM ai_usage_limits WHERE limit_type = 'daily_user';

  -- 当日のセッション別カウント
  SELECT COUNT(*) INTO v_daily_count
  FROM ai_usage_logs
  WHERE session_id = p_session_id
    AND created_at >= v_today AT TIME ZONE 'Asia/Tokyo'
    AND created_at < (v_today + 1) AT TIME ZONE 'Asia/Tokyo';

  -- 日次制限チェック
  IF v_daily_count >= v_daily_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'daily_remaining', 0,
      'reason', 'daily_limit_reached'
    );
  END IF;

  -- 月次制限値を取得
  SELECT limit_value INTO v_monthly_limit
  FROM ai_usage_limits WHERE limit_type = 'monthly_site';

  -- 当月の全セッションカウント
  v_month_start := date_trunc('month', now() AT TIME ZONE 'Asia/Tokyo') AT TIME ZONE 'Asia/Tokyo';
  SELECT COUNT(*) INTO v_monthly_count
  FROM ai_usage_logs
  WHERE created_at >= v_month_start;

  -- 月次制限チェック
  IF v_monthly_count >= v_monthly_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'daily_remaining', v_daily_limit - v_daily_count,
      'reason', 'monthly_limit_reached'
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'daily_remaining', v_daily_limit - v_daily_count,
    'reason', null
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4. エラーハンドリング

#### 4.1 Gemini API 障害

| エラー種別 | 検知方法 | 対処 |
|-----------|---------|------|
| タイムアウト | AbortController (15 秒) | エラーメッセージ表示 |
| 500 エラー | response.status | エラーメッセージ表示 |
| レート制限 (429) | response.status | 待機後リトライ（最大 1 回） |
| ネットワークエラー | fetch catch | エラーメッセージ表示 |

**エラーメッセージ** (FUNE の人格):

> 申し訳ありません、ただいま混み合っています。少し時間をおいてから、もう一度お試しください。ブログページから直接記事をお探しいただくこともできますよ。

+ リトライボタン + `/blog` リンク

#### 4.2 クライアント側エラー

| エラー | 対処 |
|--------|------|
| ネットワーク切断 | オフラインメッセージ表示 |
| SSE 接続断 | リトライ or エラーメッセージ |
| 不正なレスポンス | エラーメッセージ + リトライ |

#### 4.3 入力バリデーション

| バリデーション | 条件 |
|--------------|------|
| 空メッセージ | 送信ボタン無効化 |
| 文字数上限 | 500 文字（超過時は警告） |
| 連続送信防止 | ストリーミング中は入力不可 |

### 5. UI フィードバック

**残回数の表示**:
- 入力欄の近くに「残り X 回」を控えめに表示（残り 5 回以下の場合のみ）
- 残り 0 回: 入力欄を無効化 + メッセージ表示

**エラー状態の表示**:
- エラーメッセージは会話エリアに FUNE のメッセージとして表示
- リトライボタン付き
- 深刻なエラー（月次制限、API 障害）: 入力欄を無効化

### 6. Chat API への統合

Ticket 24 の `/api/ai/chat` を更新:

```typescript
// 処理フローの最初に追加
const limitCheck = await supabase.rpc('check_usage_limit', {
  p_session_id: session_id
})

if (!limitCheck.data.allowed) {
  // 制限超過レスポンスを返す
  return new Response(
    formatSSE({ type: 'error', content: getLimitMessage(limitCheck.data.reason) }),
    { headers: { 'Content-Type': 'text/event-stream' } }
  )
}
```

---

## 完了条件

- [ ] ユーザー日次制限が正しく動作する（N 回超過で制限）
- [ ] サイト月次上限が正しく動作する
- [ ] 制限到達時に FUNE の人格でメッセージが表示される
- [ ] 制限到達時に `/blog` へのリンクが表示される
- [ ] Gemini API タイムアウト時にエラーメッセージが表示される
- [ ] リトライボタンが動作する
- [ ] 残回数が適切に表示される（残り 5 回以下）
- [ ] 入力バリデーション（空、文字数超過、連続送信防止）
- [ ] `npm run build` が成功する
