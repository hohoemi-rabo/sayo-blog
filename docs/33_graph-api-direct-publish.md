# Ticket 33: Graph API 直接投稿（FB SDK + メディアコンテナ）

> **フェーズ**: Phase 3A
> **依存**: 29（DB）, 31（管理画面 UI）
> **ブロック**: なし

---

## 概要

Instagram Graph API v21.0 経由で管理パネルからワンクリック投稿できるようにする。
Facebook SDK でショートトークンを取得し、サーバー側でロングトークンに交換・IG ビジネスアカウント ID を取得、メディアコンテナ作成 → ポーリング → 公開の 3 ステップで投稿する。
PostCraft の実装を参考にする（コードは移植せずパターンのみ参考）。

---

## 実装内容

### 1. 前提条件

| 項目 | 値 |
|------|-----|
| IG アカウント | `@fune.iida.toyooka.odekake`（ビジネスアカウント） |
| FB ページ連携 | 済み |
| Graph API バージョン | v21.0 |
| 画像 URL | Supabase Storage の `ig-posts` バケット（public）から配信 |

### 2. 環境変数（新規）

| 変数 | 必須 | 説明 |
|------|-----|------|
| `NEXT_PUBLIC_FACEBOOK_APP_ID` | 必須 | Facebook App ID（FB SDK 初期化用） |
| `FACEBOOK_APP_SECRET` | 必須 | Facebook App Secret（サーバー側のみ、ロングトークン交換用） |

`.env.local` の例示と README を更新する。

### 3. Facebook SDK 読み込み

`src/components/admin/instagram/FacebookSdkLoader.tsx`（Client Component, 新規）:

```typescript
'use client'
// https://connect.facebook.net/en_US/sdk.js を読み込み
// FB.init({ appId, version: 'v21.0', xfbml: false, cookie: false })
// window.FB をグローバル参照可能にする
```

`/admin/instagram/posts` の layout または page で読み込む。

### 4. ログインフロー

#### 4.1 クライアント側

`useInstagramLogin()` フック（`src/hooks/useInstagramLogin.ts`）:

```typescript
export function useInstagramLogin() {
  const login = async (): Promise<{ accountId: string, username: string } | null> => {
    // 1. FB.login({ scope: 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,business_management' })
    // 2. 取得した短期トークンを POST /api/instagram/accounts へ送る
    // 3. サーバー側で長期トークン化 + IG アカウント情報取得
    // 4. IG アカウント情報を localStorage に保存
    //    { accountId, username, expiresAt }
  }
  return { login, logout, currentAccount }
}
```

トークンは **localStorage に保存しない**。サーバー側セッション／API 呼び出しごとにアクセストークンをやり取りする設計にする（セキュリティ要件 12）。

#### 4.2 トークン管理

実装上は 2 パターンある:

| パターン | 説明 | 本プロジェクト採用 |
|---------|------|-------------------|
| A: サーバー側に暗号化保存 | ロングトークンを DB / Edge Config に保存 | ✅ `ig_settings.instagram_token`（暗号化） |
| B: 都度 FB.login() | 投稿のたびに FB.login() で短期トークンを取り直す | 次善策 |

**本チケットはパターン A** を採用する:
- サーバー側で `FACEBOOK_APP_SECRET` 使用して短期 → 長期トークン交換（60 日有効）
- ロングトークン + IG アカウント ID + expires_at を `ig_settings.instagram_token`（jsonb）に保存
- 暗号化は `crypto` モジュールで AES-256（環境変数 `INSTAGRAM_TOKEN_SECRET`）
- 期限切れ時は再ログインを要求

### 5. API ルート

#### 5.1 `POST /api/instagram/accounts`

ボディ: `{ short_token: string }`

処理:
1. 認証チェック（admin_auth）
2. `GET https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id={APP_ID}&client_secret={APP_SECRET}&fb_exchange_token={short_token}` → ロングトークン取得
3. `GET https://graph.facebook.com/v21.0/me/accounts?access_token=<long>` → FB ページ一覧
4. 各ページから `instagram_business_account` を取得
5. IG アカウント ID と username を返す
6. `ig_settings.instagram_token` に保存

レスポンス: `{ accountId, username, expiresAt }`

#### 5.2 `POST /api/instagram/publish`

ボディ: `{ ig_post_id: string }` （DB 上の ig_posts.id）

処理:
1. 認証チェック
2. `ig_posts` から該当レコード取得（caption, hashtags, image_url）
3. トークン取得（`ig_settings.instagram_token`、期限切れなら 401）
4. **ステップ 1: メディアコンテナ作成**
   ```
   POST https://graph.facebook.com/v21.0/{ig-user-id}/media
     image_url={image_url or thumbnail_url}
     caption={caption + ハッシュタグ}
     access_token={long_token}
   ```
   → `creation_id` 取得
5. **ステップ 2: ポーリング**（最大 120 回 / 1 秒間隔 = 2 分）
   ```
   GET https://graph.facebook.com/v21.0/{creation_id}?fields=status_code
   ```
   - `FINISHED` → ステップ 3 へ
   - `IN_PROGRESS` → リトライ
   - `ERROR` / `EXPIRED` → エラー返却
6. **ステップ 3: 公開**
   ```
   POST https://graph.facebook.com/v21.0/{ig-user-id}/media_publish
     creation_id={creation_id}
     access_token={long_token}
   ```
   → `id` (メディア ID) 取得
7. `ig_posts` を UPDATE: `status='published'`, `instagram_media_id=<id>`, `instagram_published_at=now()`

レスポンス: `{ success: true, media_id }` / `{ success: false, error }`

画像:
- `image_url` が null の場合は元記事 `thumbnail_url` を使用
- 両方 null の場合は 400 エラー

### 6. UI 拡張（`/admin/instagram/posts`）

Ticket 31 で作った画面に以下を追加:

#### 6.1 ページ上部

- 「📷 Instagram ログイン」ボタン（未ログイン時）
  - クリック → FB.login → /api/instagram/accounts
- 接続済み表示（ログイン済み時）
  - `@{username}`（接続中）+ 「ログアウト」
  - 期限切れ: 「再ログインが必要です」警告

#### 6.2 各下書きカード

- **🚀 Instagram に投稿** ボタン追加（status='draft' のときのみ表示）
  - クリック → 確認ダイアログ → POST /api/instagram/publish
  - 処理中: スピナー表示 + ボタン無効化
  - 成功: Toast「投稿しました」+ ステータスが `published` に更新
  - 失敗: Toast にエラー詳細

### 7. エラーハンドリング

| エラー | 対応 |
|-------|------|
| トークン期限切れ | 401 返却 + UI に「再ログイン」ボタン表示 |
| 画像 URL が非公開 | 400 返却 + 「画像を公開設定に」メッセージ |
| ポーリングタイムアウト | 504 返却 + ig_posts はそのまま（再試行可） |
| Graph API のレート制限 | エラーメッセージを Toast 表示 |
| 画像比率エラー | IG の要件（横 1.91:1 ～ 縦 4:5）を明示 |

### 8. セキュリティ

- `FACEBOOK_APP_SECRET` はサーバーサイドのみ
- トークンは AES-256 で暗号化して `ig_settings` に保存
- ログインは管理者のみ（`admin_auth` cookie 必須）
- 公開バケット URL は画像のみ、他の機密ファイルは非公開バケットに分離済み

### 9. Graph API 呼び出しライブラリ

`src/lib/instagram-graph.ts` を新規作成し、Graph API 呼び出しを集約:

```typescript
export async function exchangeToLongToken(shortToken: string): Promise<LongTokenResponse>
export async function getIgBusinessAccount(longToken: string): Promise<IgAccount>
export async function createMediaContainer(params: {...}): Promise<{ creation_id: string }>
export async function pollMediaStatus(creation_id: string, token: string): Promise<'FINISHED'|'ERROR'|'EXPIRED'>
export async function publishMedia(params: {...}): Promise<{ id: string }>
```

---

## ファイル構成

```
src/app/api/instagram/
├── accounts/route.ts              # POST
└── publish/route.ts               # POST

src/lib/
├── instagram-graph.ts             # 新規 - Graph API 呼び出し
└── ig-token-crypto.ts             # 新規 - AES-256 暗号化ラッパー

src/hooks/
└── useInstagramLogin.ts           # 新規

src/components/admin/instagram/
├── FacebookSdkLoader.tsx          # 新規
└── InstagramLoginButton.tsx       # 新規 (/admin/instagram/posts 上部)

src/app/(admin)/admin/instagram/posts/_components/
└── IgPostCard.tsx                 # 編集 - 「🚀 投稿」ボタン追加
```

---

## 完了条件

- [ ] `.env.local.example` に `NEXT_PUBLIC_FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` / `INSTAGRAM_TOKEN_SECRET` が追加されている
- [ ] FB SDK が `/admin/instagram/posts` で読み込まれている
- [ ] `POST /api/instagram/accounts` で short → long トークン交換 + IG アカウント取得できる
- [ ] ロングトークンが AES-256 で暗号化されて `ig_settings.instagram_token` に保存される
- [ ] `POST /api/instagram/publish` でメディアコンテナ作成 → ポーリング → 公開の 3 ステップが実行される
- [ ] ポーリングは最大 120 回（1 秒間隔）で実行される
- [ ] 投稿成功時に `ig_posts.status='published'`, `instagram_media_id`, `instagram_published_at` が更新される
- [ ] 管理画面に「Instagram ログイン」ボタンが表示され、ログイン後に username が表示される
- [ ] 各下書きカードに「🚀 Instagram に投稿」ボタンが表示される
- [ ] トークン期限切れ時に再ログイン UI が表示される
- [ ] 画像 URL がない場合は元記事サムネイルが自動で使われる
- [ ] `npm run build` が成功する
