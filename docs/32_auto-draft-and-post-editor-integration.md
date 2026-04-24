# Ticket 32: 自動下書き生成 + 記事編集画面統合

> **フェーズ**: Phase 3A
> **依存**: 29（DB + settings）, 30（生成ロジック）, 31（API）
> **ブロック**: なし

---

## 概要

ブログ記事公開時（`is_published: false → true`）に Instagram 下書きを自動生成する機構を組み込み、既存の記事編集画面（`/admin/posts/[id]`）に「Instagram 投稿」セクションを追加する。
管理者は記事編集画面から直接下書きを確認・追加生成できるようにする。

---

## 実装内容

### 1. 自動下書き生成トリガー

#### 1.1 発動条件

既存の記事保存 Server Action または API（`/api/admin/posts/[id]` など）で、保存後に以下条件を満たす場合に発動する:

- 保存前: `is_published = false` または新規作成
- 保存後: `is_published = true`
- `ig_settings.auto_generate.enabled = true`
- その記事に紐づく `ig_posts` が 0 件（既に生成済みなら重複生成しない）

#### 1.2 実装方針

**バックグラウンド処理**（レスポンスをブロックしない）:

```typescript
// src/lib/ig-auto-generator.ts（新規）
export async function triggerIgAutoGenerate(postId: string): Promise<void> {
  // 1. ig_settings.auto_generate を取得
  // 2. enabled === false なら何もしない
  // 3. ig_posts に既存下書きがあれば何もしない
  // 4. generateIgCaptions(postId, count_on_publish) を呼ぶ
  // 5. ig_posts に INSERT
  // 6. エラーは console.error のみ（記事保存は成功させる）
}
```

Next.js 15 の `after()` API（`next/server` の `after`）を利用してレスポンス後に実行する:

```typescript
import { after } from 'next/server'

// 記事保存 API 内
if (wasUnpublished && nowPublished) {
  after(() => triggerIgAutoGenerate(post.id))
}
```

※ 既存の記事保存ロジックの場所は `src/app/(admin)/admin/posts/` 配下を調査し、最小限の修正で組み込む。

#### 1.3 設定 ON/OFF トグル

`ig_settings.auto_generate` の更新 UI を `/admin/instagram/posts` の設定セクション（ページ上部）に小さく配置する（フル設定画面は作らない）。

- チェックボックス: 「記事公開時に IG 下書きを自動生成する」
- 件数入力: 「公開時に何件生成するか（デフォルト 1）」

Server Action: `updateAutoGenerateConfig({ enabled, count_on_publish })`

### 2. 記事編集画面への統合

**対象ファイル**: `src/app/(admin)/admin/posts/[id]/page.tsx`（または edit 配下）

#### 2.1 配置

記事編集フォームの下部に「📷 Instagram 投稿」セクションを追加。新規作成時は非表示、編集時のみ表示。

#### 2.2 表示内容

```
─── 📷 Instagram 投稿 ───────────────
  この記事に紐づく IG 下書き: N 件

  [IG 下書き一覧へ] → /admin/instagram/posts?post_id=xxx
  [追加生成]       → ダイアログ → POST /api/admin/instagram/posts

  最新 3 件のカード（簡易表示）:
    ┌─────────────┐
    │ 1/N [draft] │
    │ キャプション │
    │ プレビュー   │
    │  [編集][削除]│
    └─────────────┘
```

#### 2.3 Component

```
src/components/admin/posts/IgPostsSection.tsx   # 新規 Client Component
```

- 記事 ID を props で受け取る
- `GET /api/admin/instagram/posts?post_id=xxx` で取得
- 最新 3 件を表示 + 「すべて表示」リンク
- 「追加生成」ボタン → ダイアログ共通化（Ticket 31 の GenerateDialog を再利用）

#### 2.4 IG 記事からの逆参照（Ticket 38 向け下地）

Phase 3B で `ig_imported_posts.generated_post_id` 経由で記事が生成される。その記事を編集する際、元 IG 投稿情報を表示する枠も同セクションに追加する。

```
─── 📥 元 Instagram 投稿 ───────────
  この記事は @xxx の IG 投稿から生成されました。
  元投稿: [IG URL へのリンク]
  クレジット表記: 自動挿入済み
```

※ 該当記事のみ表示（`ig_imported_posts` を `generated_post_id = post.id` で検索）。

### 3. ig_settings 読み書きライブラリ

`src/lib/ig-settings.ts` を新規作成:

```typescript
export async function getIgSetting<K extends keyof IgSettingsMap>(
  key: K
): Promise<IgSettingsMap[K] | null>

export async function updateIgSetting<K extends keyof IgSettingsMap>(
  key: K,
  value: IgSettingsMap[K]
): Promise<void>

export interface IgSettingsMap {
  caption_config: IgCaptionConfig
  auto_generate: IgAutoGenerateConfig
  instagram_account: { username: string; facebook_page_connected: boolean }
}
```

Supabase の `createAdminClient()` を使用（サーバー側のみ）。

### 4. エラーハンドリング

| ケース | 対応 |
|-------|------|
| 自動生成中に Gemini エラー | ログ記録 + 記事公開は成功 |
| 既に下書きあり | スキップ（重複生成防止） |
| 設定が無効 | 何もしない |
| `auto_generate` 設定レコード欠損 | デフォルト値（enabled: true, count: 1）で動作 |

### 5. 既存記事保存ロジックの調査

作業前に以下を確認する:
- `src/app/(admin)/admin/posts/` 配下の保存処理（Server Action か API Route か）
- `is_published` の変更検知ポイント
- 既存のリバリデート（`revalidatePath` / `revalidateTag`）との干渉

---

## ファイル構成

```
src/lib/
├── ig-auto-generator.ts          # 新規 - 自動生成トリガー
└── ig-settings.ts                # 新規 - settings 読み書き

src/components/admin/posts/
└── IgPostsSection.tsx            # 新規 - 記事編集画面統合

src/app/(admin)/admin/instagram/posts/
└── _components/
    └── AutoGenerateSettings.tsx  # 新規 - ON/OFF トグル

src/app/(admin)/admin/posts/[id]/page.tsx   # 編集 - セクション追加
src/app/api/admin/posts/[id]/route.ts        # 編集 - after() で自動生成呼び出し
                                              # (ファイルパスは既存コード調査結果に依存)
```

---

## 完了条件

- [×] `triggerIgAutoGenerate(postId)` が実装されている
- [×] 記事保存時（`false → true`）に `after()` で自動生成がバックグラウンド発動する
- [×] 既に下書きが 1 件以上ある記事では自動生成がスキップされる
- [×] `ig_settings.auto_generate.enabled = false` で自動生成が停止する
- [×] `/admin/instagram/posts` ページ上部で auto_generate 設定を変更できる
- [×] 記事編集画面に「📷 Instagram 投稿」セクションが表示される
- [×] セクションで最新 3 件の下書きプレビューが見られる
- [×] セクションから「IG 下書き一覧へ」「追加生成」が可能
- [×] IG 由来の記事（generated_post_id がある記事）で元 IG 投稿情報と IG URL が表示される
- [×] 自動生成エラー時も記事保存は成功する
- [×] `npm run build` が成功する

---

## 実装メモ（section-based への調整）

Ticket 31 で IG 生成が「件数指定」→「セクション選択式」に変更されたため、本チケットの自動生成は **全セクション生成** 固定で実装した:

- `auto_generate.count_on_publish` は DB 互換のため残しているが、現在の自動生成ロジックでは使用しない
- `triggerIgAutoGenerate` は `parsePostSections` で h2 セクションを全列挙し、全 index を `generateIgCaptions` に渡す
- 設定 UI は ON/OFF トグル 1 つに簡略化（`AutoGenerateSettings`）

記事編集画面側では、既存の `GenerateDialog` に `lockedPostId` prop を追加して記事セレクトを非表示にし、対象記事固定で開けるようにした。
