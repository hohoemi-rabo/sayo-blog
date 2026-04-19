# Sayo's Journal Phase 3 要件定義書

# ブログ × Instagram 双方向連携

**プロジェクト名**: Sayo's Journal Phase 3
**サイトURL**: https://www.sayo-kotoba.com/
**作成日**: 2026-04-18
**ステータス**: 要件定義完了 → 実装待ち

---

## 1. プロジェクト概要

### 1.1 ビジョン

地方の小さなお店やイベント主催者が、SNSでもブログでも情報が埋もれてしまう問題を、ブログとInstagramの自動連携で解決する地域情報プラットフォーム。

### 1.2 Sayo's Journal のコンセプト（最重要）

地域で活動されている方を取材してご紹介しつつ、取材対象者がInstagramで発信を始めるきっかけを作る取り組み。

**全体の流れ**:

```
【ステップ1】紗代さんが取材 → ブログ記事を作成（既存機能）
     ↓
【ステップ2】ブログ記事 → 紗代さんのIGから数回に分けて発信（ブログ→IG）
     ↓
【ステップ3】取材対象者がIG発信を始める（PostCraft活用 or 自力）
     ↓
【ステップ4】取材対象者のIG投稿 → ブログに集約・再構成（IG→ブログ）
```

- **ブログ** = しっかり取材内容を伝える場
- **Instagram** = その魅力を少しずつ届ける場

### 1.3 マネタイズ方針

最初は無料で価値を証明する。sayoblogに掲載した飲食店やイベント主催者に「あなたの情報をInstagramでも拡散しますよ」「Instagram投稿をブログにも載せますよ」と無料で提供し、「このプラットフォームに関わると露出が増える」という実績を作った後に収益化を検討。

### 1.4 技術スタック（既存 + 追加）

| 技術                     | 用途                               | 備考                                |
| ------------------------ | ---------------------------------- | ----------------------------------- |
| Next.js 15 (App Router)  | フレームワーク                     | 既存                                |
| React 19                 | UI                                 | 既存                                |
| TypeScript 5             | 型安全性                           | 既存                                |
| Tailwind CSS 3.4         | スタイリング                       | 既存                                |
| Supabase                 | DB + Storage + Auth                | 既存プロジェクト（sayo-blog）に統合 |
| Google Gemini            | AI生成（キャプション・記事再構成） | 既存 gemini-3-flash-preview         |
| Facebook Graph API v21.0 | Instagram直接投稿                  | **新規追加**                        |
| NextAuth.js v5           | Google OAuth認証                   | **新規追加**（PostCraft参考）       |
| 外部データ取得サービス   | IG投稿データ取得（許可を得た上で） | **新規追加**                        |

### 1.5 実装環境

- **コードベース**: sayoblogのリポジトリに統合（PostCraftのコードは参考のみ）
- **Supabase**: 既存プロジェクト sayo-blog（ID: nkvohswifpmarobyrnbe, リージョン: ap-northeast-1）に新テーブル追加
- **デプロイ**: Vercel（既存）
- **参考リポジトリ**: PostCraft（Instagram投稿・Graph API周りの実装参考）

### 1.6 操作者

| 操作者           | 役割                   | Googleアカウント         |
| ---------------- | ---------------------- | ------------------------ |
| 本岡紗代（FUNE） | 記事執筆・IG投稿・取材 | mo10okamitoriz@gmail.com |
| まさゆき         | 技術実装・IG取得設定   | （設定時に追加）         |

※ 2人同時ログイン対応が必要

---

## 2. 実装フェーズ構成

Phase 3は以下の順序で実装する。

### Phase 3A: ブログ → Instagram 方向（先行実装）

ブログ記事からIG投稿素材を自動生成し、紗代さんのアカウントから発信する機能。

### Phase 3B: Instagram → ブログ方向（後続実装）

地域の飲食店・イベント主催者のIG投稿を取得し、AIでブログ記事として再構成する機能。

### Phase 3C: 認証リニューアル（最後に実装）

管理パネルの認証をパスワード方式からGoogle OAuthに変更。

※ Phase 3C実装まで は現在の簡易パスワードログインを維持する。

---

## 3. Phase 3A: ブログ → Instagram 方向

### 3.1 機能概要

ブログ記事の公開時にAIがInstagram用のキャプション・ハッシュタグの下書きを自動生成する。管理者は下書きを確認・編集した上で、Graph API経由で直接投稿するか、素材をコピーして手動投稿する。1つの記事から複数回分のIG投稿を生成可能。

### 3.2 Instagram投稿先アカウント

| 項目               | 値                         |
| ------------------ | -------------------------- |
| アカウント名       | @fune.iida.toyooka.odekake |
| アカウント種別     | ビジネスアカウント         |
| Facebookページ連携 | 済み                       |

### 3.3 自動下書き生成フロー

```
記事を公開（is_published = true）
     ↓
Webhook / トリガーで検知
     ↓
AIがIG投稿の下書きを1件自動生成
     ↓
管理パネルの「Instagram連携」に下書きとして保存
     ↓
管理者が確認・編集
     ↓
追加生成が必要な場合「○件追加生成」で複数下書き作成
     ↓
Graph API投稿 or コピーして手動投稿
```

### 3.4 AI キャプション生成仕様

#### 入力データ

| 入力          | ソース                            |
| ------------- | --------------------------------- |
| 記事タイトル  | posts.title                       |
| 記事抜粋      | posts.excerpt                     |
| 記事本文      | posts.content（HTMLをテキスト化） |
| カテゴリ      | post_categories 経由              |
| ハッシュタグ  | post_hashtags 経由                |
| サムネイルURL | posts.thumbnail_url               |

#### 出力

| 項目             | 仕様                                                                  |
| ---------------- | --------------------------------------------------------------------- |
| キャプション     | 200〜400文字                                                          |
| トーン           | FUNEの語り口調。場所・お店紹介は情報型                                |
| 必須ハッシュタグ | `#長野県飯田市` `#sayosjournalブログ記事`（キャプション冒頭に横並び） |
| 生成ハッシュタグ | 8個（合計10個、キャプション末尾に縦並び）                             |
| ブログ記事リンク | キャプション末尾に記事URLを含める                                     |

#### キャプション出力フォーマット例

```
#長野県飯田市 #sayosjournalブログ記事

こんにちは、FUNEです。
今回は飯田市本町の「お好み焼 4resT」さんを取材しました。
春限定メニュー「春玉」は…（以下本文）

📍詳しくはブログで
https://www.sayo-kotoba.com/gourmet/4rest-okonomiyaki-harutama

#飯田市グルメ
#お好み焼き
#南信州ランチ
#鉄板焼き
#飯田市ランチ
#長野県グルメ
#南信州
#地域ブログ
```

#### 複数投稿生成

1つのブログ記事から複数のIG投稿を生成する機能。

- 管理者が生成数を指定（例：「3件生成」）
- AIが記事内容を分析し、異なる切り口で複数のキャプションを生成
- 各投稿には通し番号を付与（例：「1/3」「2/3」「3/3」）
- 投稿ごとに異なる角度：紹介・深掘り・告知など
- 管理者が個別に編集・削除・並べ替え可能

### 3.5 投稿画像

| 項目       | 仕様                                                                   |
| ---------- | ---------------------------------------------------------------------- |
| 画像ソース | ブログ記事のサムネイル画像をそのまま使用                               |
| 比率調整   | サムネイルの比率が合わない場合は拡大縮小で全体を収める                 |
| 保存先     | Supabase Storage（ig-postsバケット）                                   |
| 将来拡張   | サムネイルにキャッチコピーを重ねるオプション（Phase 3A初期では未実装） |

### 3.6 投稿方法（2種類対応）

#### 方法A: Graph API 直接投稿

PostCraftの実装を参考に、管理パネルからワンクリックで投稿。

1. 管理パネルで「Instagramログイン」ボタン → FB SDK → トークン取得
2. 投稿ボタンをクリック → メディアコンテナ作成 → ポーリング → 公開
3. 投稿成功 → ig_posts テーブルの `instagram_published = true` を更新

**必要なAPI**:

- POST `/api/instagram/accounts` — FBトークン交換 + IGアカウント取得
- POST `/api/instagram/publish` — メディアコンテナ作成 → ポーリング → 公開

#### 方法B: 手動コピー投稿

1. 管理パネルでキャプション・ハッシュタグをコピー
2. 画像をダウンロード
3. Instagramアプリから手動投稿
4. 管理パネルで「手動投稿済み」マーク

### 3.7 管理パネルUI（ブログ→IG）

既存サイドバーに「📷 Instagram連携」セクションを追加。

#### IG投稿管理画面（/admin/instagram/posts）

- 下書き一覧（未投稿・投稿済みフィルター）
- 各下書きカード：キャプションプレビュー + サムネイル + 投稿ステータス
- 「投稿する」ボタン（Graph API）
- 「コピー」ボタン（キャプション + ハッシュタグ）
- 「手動投稿済み」ボタン
- 「編集」ボタン（キャプション・ハッシュタグの手動編集）
- 「削除」ボタン
- 「追加生成」ボタン（生成数を指定）

#### 記事管理画面への統合

既存の記事編集画面に「Instagram下書き」セクションを追加し、その記事に紐づくIG投稿の一覧を表示する。

---

## 4. Phase 3B: Instagram → ブログ方向

### 4.1 機能概要

地域の飲食店・イベント主催者のIG投稿を（許可を得て）取得し、AIでブログ記事の下書きとして再構成する。管理者が確認・加筆・編集した上で公開する。

### 4.2 IG取得先アカウント管理

#### 対象規模

| 項目       | 値                |
| ---------- | ----------------- |
| 初期登録数 | 10件程度          |
| 追加頻度   | 月5件（年間60件） |

#### アカウント登録情報

| フィールド     | 説明                                    |
| -------------- | --------------------------------------- |
| IGアカウント名 | @xxx                                    |
| 表示名         | 店舗名・主催者名                        |
| カテゴリ       | gourmet / event / spot / culture / news |
| 許可状態       | 未依頼 / 依頼中 / 許可済み / 拒否       |
| 許可日         | 許可を得た日付                          |
| 許可メモ       | 許可の経緯・連絡手段などの記録          |
| 取得設定       | 有効 / 無効                             |
| 連絡先         | DM / メール等                           |
| 登録日         | 自動                                    |

### 4.3 IG投稿取得

#### 取得方法

外部データ取得サービス経由で、許可を得たアカウントのIG投稿を取得する。

- **Phase 3B初期**: 手動取得のみ（管理パネルの「今取得」ボタン）
- **将来**: 定期取得（1日1回自動取得）を追加 — GitHub Actions で Bright Data API を定期呼び出し

#### 取得方式

| 方式               | 説明                                         |
| ------------------ | -------------------------------------------- |
| アカウント指定取得 | 登録済みアカウントの最新投稿を取得           |
| キーワード検索取得 | ハッシュタグ・キーワードで関連投稿を検索取得 |

※ 許可を得ていないアカウントの投稿は取得しない

#### 取得データ

| フィールド      | 説明                 |
| --------------- | -------------------- |
| IG投稿ID        | 投稿の一意識別子     |
| キャプション    | 投稿テキスト         |
| 画像URL（複数） | 投稿画像             |
| 投稿日時        | 元の投稿日時         |
| いいね数        | エンゲージメント参考 |
| IGアカウント    | 投稿者               |
| 投稿URL         | 元投稿へのリンク     |

#### 重複制御

同一IG投稿IDの二重取得を防止する。

### 4.4 AI記事再構成

#### 処理フロー

```
取得したIG投稿データ
     ↓
管理者が記事化対象を選択
     ↓
AIが記事の下書きを自動生成
     ↓
管理パネルで確認・編集
     ↓
紗代さんが取材・加筆（必要に応じて）
     ↓
公開
```

#### AI生成仕様

| 項目   | 仕様                                                                                 |
| ------ | ------------------------------------------------------------------------------------ |
| 入力   | IG投稿のキャプション + 画像（マルチモーダル）                                        |
| 出力   | 記事タイトル + 本文（HTML） + 推奨カテゴリ + 推奨ハッシュタグ                        |
| 文体   | FUNEトーン（通常のブログ記事と同じ語り口調）                                         |
| 注意点 | IG投稿の情報量が少ない場合、AIは無理に長い記事を生成せず、加筆が必要な箇所を明示する |

#### カテゴリ・ハッシュタグ

- カテゴリ: AIが推奨カテゴリを提案するが、最終的には管理者が手動で選択
- ハッシュタグ: AIが自動生成、管理者が手動で編集可能

#### クレジット表記

記事内に以下を必ず含める（自動挿入）。

- クレジット文: 「この記事は〇〇さん（@xxx）のInstagram投稿を元に作成しました」
- 元IG投稿へのリンク

### 4.5 画像の扱い

| 項目         | 仕様                                           |
| ------------ | ---------------------------------------------- |
| 保存先       | Supabase Storage（ig-imported バケット）       |
| 用途         | ブログ記事のサムネイル・本文内の写真として使用 |
| 元投稿リンク | 記事内に元IG投稿へのリンクを掲載               |

### 4.6 管理パネルUI（IG→ブログ）

#### 取得先アカウント管理画面（/admin/instagram/sources）

- アカウント一覧（許可状態でフィルター）
- 新規登録フォーム
- アカウント詳細・編集（許可メモ・取得設定）
- 「今取得」ボタン（手動取得）
- 各アカウントの最終取得日時表示

#### 取得投稿一覧画面（/admin/instagram/imports）

- 取得済みIG投稿の一覧
- ステータスフィルター（未処理 / 記事化中 / 公開済み / スキップ）
- 各投稿カード: キャプションプレビュー + 画像サムネイル + 投稿者
- 「記事化する」ボタン → AI記事生成 → 記事編集画面へ遷移
- 「スキップ」ボタン（記事化不要な投稿を除外）

---

## 5. Phase 3C: 認証リニューアル

### 5.1 概要

管理パネルの認証をパスワード方式からGoogle OAuthに変更する。Phase 3A・3B完了後、最後に実装する。

### 5.2 現状（Phase 3A・3B実装中）

現在のパスワード認証（cookie: `admin_auth`）をそのまま維持。紗代さん・まさゆきさんは同じパスワードでログインする。

### 5.3 変更後

| 項目           | 仕様                                              |
| -------------- | ------------------------------------------------- |
| 認証方式       | Google OAuth（NextAuth.js v5）                    |
| セッション管理 | JWT                                               |
| 許可ユーザー   | メールホワイトリスト方式                          |
| 許可メール     | mo10okamitoriz@gmail.com, （まさゆきさんのGmail） |
| 同時ログイン   | 対応（JWT方式のため問題なし）                     |

### 5.4 移行手順

1. NextAuth.js v5 を導入
2. Google Cloud Console で OAuth クライアントを設定
3. `/api/auth/[...nextauth]` ルート作成
4. ミドルウェア更新（admin_auth cookie → NextAuth session）
5. 管理パネルのログイン画面を「Googleでログイン」ボタンに変更
6. 旧パスワード認証のコードを削除

### 5.5 環境変数（追加）

| 変数                   | 説明                               |
| ---------------------- | ---------------------------------- |
| `GOOGLE_CLIENT_ID`     | OAuth クライアントID               |
| `GOOGLE_CLIENT_SECRET` | OAuth クライアントシークレット     |
| `NEXTAUTH_SECRET`      | セッション暗号化キー               |
| `NEXTAUTH_URL`         | サイトURL                          |
| `ALLOWED_EMAILS`       | 許可メールアドレス（カンマ区切り） |

---

## 6. データベーススキーマ（新規テーブル）

既存の sayo-blog Supabase プロジェクトに以下のテーブルを追加する。

### 6.1 ig_posts（Instagram投稿 — ブログ→IG方向）

ブログ記事から生成されたIG投稿の下書き・投稿履歴を管理する。

| カラム                 | 型          | 制約                          | 説明                                 |
| ---------------------- | ----------- | ----------------------------- | ------------------------------------ |
| id                     | uuid        | PK, default gen_random_uuid() |                                      |
| post_id                | uuid        | FK → posts.id (CASCADE)       | 元ブログ記事                         |
| caption                | text        | NOT NULL                      | AIが生成したキャプション             |
| hashtags               | text[]      | NOT NULL                      | ハッシュタグ配列（計10個）           |
| image_url              | text        | nullable                      | IG投稿用画像URL（Storage）           |
| sequence_number        | integer     | default 1                     | 同一記事内の投稿順序                 |
| status                 | text        | default 'draft'               | draft / published / manual_published |
| instagram_media_id     | text        | nullable                      | Graph API投稿後のメディアID          |
| instagram_published_at | timestamptz | nullable                      | IG投稿日時                           |
| created_at             | timestamptz | default now()                 |                                      |
| updated_at             | timestamptz | default now()                 |                                      |

### 6.2 ig_sources（IG取得先アカウント — IG→ブログ方向）

監視対象のIGアカウントを管理する。

| カラム            | 型          | 制約                          | 説明                                          |
| ----------------- | ----------- | ----------------------------- | --------------------------------------------- |
| id                | uuid        | PK, default gen_random_uuid() |                                               |
| ig_username       | text        | NOT NULL, UNIQUE              | @以降のユーザー名                             |
| display_name      | text        | NOT NULL                      | 表示名（店舗名等）                            |
| category_slug     | text        | nullable                      | デフォルトカテゴリ                            |
| permission_status | text        | default 'not_requested'       | not_requested / requested / approved / denied |
| permission_date   | date        | nullable                      | 許可取得日                                    |
| permission_memo   | text        | nullable                      | 許可の経緯メモ                                |
| contact_info      | text        | nullable                      | 連絡先情報                                    |
| is_active         | boolean     | default false                 | 取得有効/無効                                 |
| last_fetched_at   | timestamptz | nullable                      | 最終取得日時                                  |
| created_at        | timestamptz | default now()                 |                                               |
| updated_at        | timestamptz | default now()                 |                                               |

### 6.3 ig_imported_posts（取得済みIG投稿 — IG→ブログ方向）

外部から取得したIG投稿の生データを保存する。

| カラム            | 型          | 制約                               | 説明                                       |
| ----------------- | ----------- | ---------------------------------- | ------------------------------------------ |
| id                | uuid        | PK, default gen_random_uuid()      |                                            |
| source_id         | uuid        | FK → ig_sources.id (CASCADE)       | 取得元アカウント                           |
| ig_post_id        | text        | NOT NULL, UNIQUE                   | IG投稿の一意ID（重複防止）                 |
| caption           | text        | nullable                           | IG投稿のキャプション                       |
| image_urls        | text[]      | nullable                           | 画像URL配列                                |
| ig_posted_at      | timestamptz | nullable                           | 元投稿の日時                               |
| likes_count       | integer     | nullable                           | いいね数                                   |
| ig_post_url       | text        | nullable                           | 元投稿のURL                                |
| status            | text        | default 'pending'                  | pending / processing / published / skipped |
| generated_post_id | uuid        | FK → posts.id (SET NULL), nullable | 生成されたブログ記事                       |
| stored_image_urls | text[]      | nullable                           | Storage保存後の画像URL                     |
| created_at        | timestamptz | default now()                      |                                            |
| updated_at        | timestamptz | default now()                      |                                            |

### 6.4 ig_settings（Instagram連携設定）

| カラム        | 型          | 制約                          | 説明     |
| ------------- | ----------- | ----------------------------- | -------- |
| id            | uuid        | PK, default gen_random_uuid() |          |
| setting_key   | text        | NOT NULL, UNIQUE              | 設定キー |
| setting_value | jsonb       | default '{}'                  | 設定値   |
| updated_at    | timestamptz | default now()                 |          |

設定キー例:

- `caption_config` — 必須ハッシュタグ、文字数範囲、トーン設定
- `instagram_account` — IGアカウント情報（トークン以外）
- `auto_generate` — 記事公開時の自動生成 ON/OFF

### 6.5 インデックス

```sql
-- ig_posts
CREATE INDEX idx_ig_posts_post_id ON ig_posts(post_id);
CREATE INDEX idx_ig_posts_status ON ig_posts(status);

-- ig_sources
CREATE INDEX idx_ig_sources_permission ON ig_sources(permission_status);
CREATE INDEX idx_ig_sources_active ON ig_sources(is_active);

-- ig_imported_posts
CREATE INDEX idx_ig_imported_source ON ig_imported_posts(source_id);
CREATE INDEX idx_ig_imported_status ON ig_imported_posts(status);
CREATE UNIQUE INDEX idx_ig_imported_ig_post_id ON ig_imported_posts(ig_post_id);
```

### 6.6 RLS ポリシー

全新規テーブルでRLS有効化。

- 匿名ユーザー: アクセス不可（管理者専用テーブル）
- 認証ユーザー: ALL操作許可（`(select auth.role()) = 'authenticated'`）

### 6.7 Storage バケット（新規）

| バケット      | 用途                    | 公開 |
| ------------- | ----------------------- | ---- |
| `ig-posts`    | ブログ→IG方向の投稿画像 | Yes  |
| `ig-imported` | IG→ブログ方向の取得画像 | Yes  |

---

## 7. API ルート（新規）

### 7.1 Instagram投稿管理（ブログ→IG）

| エンドポイント                    | メソッド | 認証   | 説明                                       |
| --------------------------------- | -------- | ------ | ------------------------------------------ |
| `/api/admin/instagram/posts`      | GET      | 管理者 | IG投稿一覧（フィルター: status, post_id）  |
| `/api/admin/instagram/posts`      | POST     | 管理者 | IG投稿を手動生成（post_id + 生成数を指定） |
| `/api/admin/instagram/posts/[id]` | PATCH    | 管理者 | IG投稿を編集（caption, hashtags, status）  |
| `/api/admin/instagram/posts/[id]` | DELETE   | 管理者 | IG投稿を削除                               |
| `/api/admin/instagram/generate`   | POST     | 管理者 | AI キャプション生成（post_id + count）     |

### 7.2 Instagram直接投稿（Graph API）

| エンドポイント            | メソッド | 認証   | 説明                                     |
| ------------------------- | -------- | ------ | ---------------------------------------- |
| `/api/instagram/accounts` | POST     | 管理者 | FBトークン交換 + IGアカウント取得        |
| `/api/instagram/publish`  | POST     | 管理者 | メディアコンテナ作成 → ポーリング → 公開 |

### 7.3 IG取得先管理（IG→ブログ）

| エンドポイント                            | メソッド | 認証   | 説明                     |
| ----------------------------------------- | -------- | ------ | ------------------------ |
| `/api/admin/instagram/sources`            | GET      | 管理者 | 取得先アカウント一覧     |
| `/api/admin/instagram/sources`            | POST     | 管理者 | 取得先アカウント新規登録 |
| `/api/admin/instagram/sources/[id]`       | PATCH    | 管理者 | 取得先アカウント編集     |
| `/api/admin/instagram/sources/[id]`       | DELETE   | 管理者 | 取得先アカウント削除     |
| `/api/admin/instagram/sources/[id]/fetch` | POST     | 管理者 | 手動取得実行             |

### 7.4 取得投稿管理（IG→ブログ）

| エンドポイント                               | メソッド | 認証   | 説明                                                    |
| -------------------------------------------- | -------- | ------ | ------------------------------------------------------- |
| `/api/admin/instagram/imports`               | GET      | 管理者 | 取得投稿一覧（フィルター: status, source_id）           |
| `/api/admin/instagram/imports/[id]/generate` | POST     | 管理者 | AI記事生成（→ 記事の下書きとして posts テーブルに保存） |
| `/api/admin/instagram/imports/[id]`          | PATCH    | 管理者 | ステータス変更（skipped等）                             |

---

## 8. 管理パネル画面構成

### 8.1 サイドバー追加

既存サイドバーに「📷 Instagram連携」セクションを追加する。

```
既存メニュー:
  📝 記事管理
  📁 カテゴリ管理
  🏷️ ハッシュタグ管理
  🖼️ メディア管理

追加メニュー:
  📷 Instagram連携          ← 新規セクション
    ├── IG投稿管理           /admin/instagram/posts
    ├── 取得先アカウント     /admin/instagram/sources
    └── 取得投稿             /admin/instagram/imports

既存メニュー:
  🤖 AI管理
    ├── ナレッジ管理
    ├── タグ管理
    └── 利用統計
```

### 8.2 画面一覧

| 画面                 | パス                     | 説明                           |
| -------------------- | ------------------------ | ------------------------------ |
| IG投稿管理           | /admin/instagram/posts   | 下書き一覧・編集・投稿         |
| 取得先アカウント管理 | /admin/instagram/sources | 監視対象アカウントの登録・管理 |
| 取得投稿一覧         | /admin/instagram/imports | 取得したIG投稿の確認・記事化   |

### 8.3 記事編集画面への統合

既存の記事編集画面（/admin/posts/[id]）に以下を追加:

- 「Instagram投稿」セクション: この記事に紐づくIG投稿の一覧と生成ボタン
- IG生成元からの記事の場合: 元IG投稿の情報とクレジット表記の確認

---

## 9. AI プロンプト設計

### 9.1 ブログ→IG キャプション生成プロンプト

```
あなたは南信州（飯田市・下伊那地域）の地域情報を発信するライター「FUNE」です。

以下のブログ記事の内容をもとに、Instagram投稿用のキャプションを生成してください。

【ルール】
- 文字数: 200〜400文字
- トーン: FUNEの語り口調（親しみやすく、温かみのある文体）
  - 場所・お店の紹介の場合は情報型（住所・営業時間等があれば含める）
- 記事の内容のみを使用し、情報を捏造しない
- 記事へのリンクをキャプション末尾に含める
- ハッシュタグは生成しない（別途処理）

【ブログ記事データ】
タイトル: {title}
カテゴリ: {category}
抜粋: {excerpt}
ハッシュタグ: {hashtags}
本文: {content_text}
記事URL: {article_url}
```

### 9.2 複数投稿生成時の追加指示

```
この記事から{count}件のInstagram投稿を生成してください。
各投稿は異なる切り口・視点で作成してください。

例:
- 1件目: 記事全体の概要・紹介
- 2件目: 特に印象的なエピソードやメニューの深掘り
- 3件目: 読者への呼びかけ・来店促進

各投稿のキャプションは独立して読めるようにしてください。
```

### 9.3 IG→ブログ 記事再構成プロンプト

```
あなたは南信州（飯田市・下伊那地域）の地域情報を発信するライター「FUNE」です。

以下のInstagram投稿をもとに、ブログ記事の下書きを作成してください。

【ルール】
- FUNEの語り口調で記事を書く
- 記事タイトル、本文（HTML形式）、推奨カテゴリ、推奨ハッシュタグを生成する
- Instagram投稿の情報のみを使用し、情報を捏造しない
- 情報量が少ない場合は、無理に長い記事にせず「※ここに追加取材の内容を加筆してください」等の加筆指示を入れる
- 記事末尾にクレジット表記を含める: 「この記事は{display_name}さん（@{ig_username}）のInstagram投稿を元に作成しました」
- 元投稿へのリンクを含める

【Instagram投稿データ】
投稿者: {display_name}（@{ig_username}）
キャプション: {caption}
投稿日: {ig_posted_at}
投稿URL: {ig_post_url}
```

---

## 10. 環境変数（追加分）

### Phase 3A で追加

| 変数                          | 必須 | 説明                |
| ----------------------------- | ---- | ------------------- |
| `NEXT_PUBLIC_FACEBOOK_APP_ID` | 必須 | Facebook App ID     |
| `FACEBOOK_APP_SECRET`         | 必須 | Facebook App Secret |

### Phase 3B で追加

| 変数                   | 必須 | 説明                                |
| ---------------------- | ---- | ----------------------------------- |
| `BRIGHTDATA_API_TOKEN` | 必須 | 外部データ取得サービスのAPIトークン |
| `BRIGHTDATA_ZONE`      | 任意 | ゾーン設定                          |

### Phase 3C で追加

| 変数                   | 必須 | 説明                                     |
| ---------------------- | ---- | ---------------------------------------- |
| `GOOGLE_CLIENT_ID`     | 必須 | OAuth クライアントID                     |
| `GOOGLE_CLIENT_SECRET` | 必須 | OAuth クライアントシークレット           |
| `NEXTAUTH_SECRET`      | 必須 | セッション暗号化キー                     |
| `NEXTAUTH_URL`         | 必須 | サイトURL（https://www.sayo-kotoba.com） |
| `ALLOWED_EMAILS`       | 必須 | 許可メールアドレス（カンマ区切り）       |

---

## 11. 既存機能への影響

### 11.1 記事公開フロー

記事公開時（`is_published` が `false → true`）にIG投稿の自動下書き生成をトリガーする。

実装方針:

- 記事保存APIのレスポンス後にバックグラウンドでIG下書き生成を実行
- 自動生成の ON/OFF は ig_settings で制御可能

### 11.2 既存テーブルへの変更

既存テーブルへのカラム追加は不要。新規テーブルから FK で参照する設計。

### 11.3 パブリックページへの影響

Phase 3ではパブリックページ（フロントエンド）への変更はなし。すべて管理パネル内の機能追加。

---

## 12. セキュリティ

- Facebook/Instagram APIのアクセストークンはサーバーサイドでのみ処理
- 外部データ取得サービスのAPIトークンはサーバーサイドでのみ使用
- 新規テーブルはRLSで保護（認証ユーザーのみアクセス可能）
- 取得したIG投稿は許可を得たアカウントのもののみ保存
- Google OAuthのメールホワイトリストで管理者を制限

---

## 13. 制限事項・前提条件

| 項目             | 制限                                                       |
| ---------------- | ---------------------------------------------------------- |
| Instagram投稿    | Business/Creator Account + Facebookページ連携が必須        |
| Graph API投稿    | 画像はパブリックURLが必要（Supabase Storage公開バケット）  |
| IG投稿ポーリング | 最大120回（2分）で公開確認                                 |
| 外部データ取得   | 許可を得たアカウントの投稿のみ取得                         |
| 同時ログイン     | 同一アカウントの同時編集による競合は未対応（楽観的ロック） |
| Google OAuth     | Phase 3C実装までは旧パスワード認証を維持                   |

---

## 14. 将来の拡張候補（Phase 3 スコープ外）

以下はPhase 3の初期スコープには含めないが、将来の拡張として検討する。

| 項目                             | 説明                                                         |
| -------------------------------- | ------------------------------------------------------------ |
| サムネイルへのキャッチコピー重ね | IG投稿用画像にテキストを合成する機能                         |
| IG定期取得                       | GitHub Actions による Bright Data API 定期呼び出し（1日1回） |
| 複数IGアカウント対応             | 投稿先アカウントを複数管理                                   |
| IG投稿のスケジュール予約         | 指定日時に自動投稿                                           |
| IG投稿のパフォーマンス分析       | エンゲージメント追跡                                         |
| PostCraft連携                    | 取材対象者へのPostCraftアカウント提供・連携                  |
