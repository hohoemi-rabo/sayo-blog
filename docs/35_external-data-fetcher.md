# Ticket 35: 外部データ取得サービス連携（IG 投稿取得）

> **フェーズ**: Phase 3B
> **依存**: 29（DB）, 34（sources 管理）
> **ブロック**: 36（取得投稿画面）

---

## 概要

許可を得た IG アカウントの最新投稿を、外部データ取得サービス（Bright Data など）経由で取得し `ig_imported_posts` に保存する機能を実装する。
Phase 3B 初期では **手動取得のみ**（管理パネルの「今取得」ボタン）とし、定期取得は将来の拡張とする。

---

## 実装内容

### 1. 前提・設計方針

- **許可されたアカウントのみ取得**（`permission_status = 'approved'` かつ `is_active = true`）
- **重複防止**: `ig_imported_posts.ig_post_id` UNIQUE を利用（同一投稿 ID の INSERT は ON CONFLICT DO NOTHING）
- **Phase 3B 初期**: アカウント指定取得のみ（キーワード検索取得は将来）
- **取得件数上限**: 1 回あたり最新 20 件まで（API コスト抑制のため）

### 2. 環境変数

| 変数 | 必須 | 説明 |
|------|-----|------|
| `BRIGHTDATA_API_TOKEN` | 必須 | Bright Data の API トークン |
| `BRIGHTDATA_ZONE` | 任意 | ゾーン設定（未指定時デフォルトゾーン） |

※ 他のサービスに切り替える可能性もあるため、抽象インターフェース層を設ける（後述）。

### 3. 抽象インターフェース

`src/lib/ig-fetcher/types.ts`:

```typescript
export interface FetchedIgPost {
  ig_post_id: string
  caption: string | null
  image_urls: string[]
  ig_posted_at: string      // ISO 8601
  likes_count: number | null
  ig_post_url: string
}

export interface IgFetcher {
  fetchByUsername(username: string, limit?: number): Promise<FetchedIgPost[]>
  fetchByHashtag?(hashtag: string, limit?: number): Promise<FetchedIgPost[]>  // 将来
}
```

### 4. Bright Data 実装

`src/lib/ig-fetcher/brightdata.ts`:

```typescript
export class BrightDataIgFetcher implements IgFetcher {
  constructor(private token: string, private zone?: string) {}
  async fetchByUsername(username: string, limit = 20): Promise<FetchedIgPost[]> {
    // Bright Data Dataset API を呼び出し
    // エンドポイント例: https://api.brightdata.com/datasets/v3/trigger
    // dataset_id: Instagram profiles / posts dataset
    // { url: `https://www.instagram.com/${username}/`, num_of_posts: limit }
    //
    // レスポンス → FetchedIgPost[] に正規化
  }
}
```

**注意**: Bright Data の具体的な API 仕様は実装時にドキュメント参照。別サービスの場合は実装クラスを差し替え。

### 5. ファクトリー関数

`src/lib/ig-fetcher/index.ts`:

```typescript
export function createIgFetcher(): IgFetcher {
  const token = process.env.BRIGHTDATA_API_TOKEN
  if (!token) throw new Error('BRIGHTDATA_API_TOKEN not set')
  return new BrightDataIgFetcher(token, process.env.BRIGHTDATA_ZONE)
}
```

### 6. API ルート: `POST /api/admin/instagram/sources/[id]/fetch`

処理フロー:

1. 認証チェック
2. `ig_sources` から該当レコード取得
3. `permission_status !== 'approved'` or `is_active !== true` → 403
4. `createIgFetcher().fetchByUsername(ig_username, 20)`
5. 取得結果を `ig_imported_posts` に UPSERT:
   - `ON CONFLICT (ig_post_id) DO NOTHING`
   - `source_id`, `status='pending'` で新規
6. `ig_sources.last_fetched_at = now()` を UPDATE
7. レスポンス: `{ fetched_count, new_count, skipped_count, errors }`

エラーハンドリング:
- 外部 API タイムアウト: 30 秒 → 504 返却
- レート制限: エラーメッセージ返却
- 取得 0 件: 正常レスポンス（new_count = 0）

### 7. UI 連携

Ticket 34 で配置した「今取得」ボタンと接続:

**`FetchNowButton.tsx`**:
```typescript
// クリック → POST /api/admin/instagram/sources/[id]/fetch
// 処理中: スピナー + ボタン無効化
// 成功: Toast「N 件取得（新規 M 件）」
// 失敗: Toast にエラー詳細
```

### 8. 画像ダウンロードは取得時には行わない

本チケットでは:
- IG 側の画像 URL を `image_urls` にそのまま保存
- Supabase Storage への保存は **Ticket 37**（記事化時）に行う

理由: 取得だけなら URL で十分。記事化しない投稿の画像を保存するのはコスト的に無駄。

### 9. 取得結果の正規化

Bright Data のレスポンスフォーマットをアダプタで統一:

```typescript
function normalizeBrightDataPost(raw: any): FetchedIgPost {
  return {
    ig_post_id: raw.post_id ?? raw.shortcode,
    caption: raw.caption ?? null,
    image_urls: Array.isArray(raw.display_urls) ? raw.display_urls : [raw.display_url].filter(Boolean),
    ig_posted_at: raw.timestamp ?? raw.date_posted,
    likes_count: raw.likes ?? null,
    ig_post_url: raw.url ?? `https://www.instagram.com/p/${raw.shortcode}/`,
  }
}
```

※ 実際のフィールド名は Bright Data Dataset の仕様に合わせて調整。

### 10. レート制御・コスト管理

- 1 アカウント 1 取得 = 1 リクエスト
- 手動取得のため制限は UI での連打防止（ボタン状態管理）
- 環境変数 `IG_FETCH_DAILY_LIMIT` でアカウント単位の 1 日上限を任意設定（未指定時は無制限）

### 11. 将来拡張（本チケットでは実装しない）

- 定期取得: GitHub Actions で `POST /api/admin/instagram/sources/batch-fetch` を 1 日 1 回呼び出し
- キーワード検索取得: `fetchByHashtag` 実装
- 取得頻度のアカウント別設定

---

## ファイル構成

```
src/lib/ig-fetcher/
├── types.ts                                # 新規 - インターフェース
├── brightdata.ts                           # 新規 - Bright Data 実装
└── index.ts                                # 新規 - ファクトリー

src/app/api/admin/instagram/sources/[id]/fetch/
└── route.ts                                # 新規 - POST

src/app/(admin)/admin/instagram/sources/_components/
└── FetchNowButton.tsx                      # 編集 - API 呼び出し実装
```

---

## 完了条件

- [ ] `.env.local.example` に `BRIGHTDATA_API_TOKEN` / `BRIGHTDATA_ZONE` が追加されている
- [ ] `IgFetcher` インターフェースと `BrightDataIgFetcher` 実装クラスが作成されている
- [ ] `createIgFetcher()` ファクトリーが実装されている
- [ ] `POST /api/admin/instagram/sources/[id]/fetch` で取得処理が実行される
- [ ] 未許可 / 非アクティブなアカウントに対しては 403 を返す
- [ ] 取得結果が `ig_imported_posts` に ON CONFLICT DO NOTHING で INSERT される
- [ ] `ig_sources.last_fetched_at` が取得後に更新される
- [ ] レスポンスに `fetched_count` / `new_count` / `skipped_count` が含まれる
- [ ] 「今取得」ボタンが API を呼び出し、結果を Toast で表示する
- [ ] 取得時は画像を Storage に保存せず URL のみ保存する
- [ ] 外部 API タイムアウト 30 秒が実装されている
- [ ] `npm run build` が成功する
