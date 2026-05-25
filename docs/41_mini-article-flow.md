# Ticket 41: ミニ記事フロー（公開フォーム + 管理画面 + AI たたき台生成 + メール通知）

> **フェーズ**: Phase 4
> **依存**: 40（共通基盤 + IG 削除）
> **ブロック**: なし（42 と並行可能）

---

## 概要

「3 つの柱」のミニ記事フローを完成させる。情報提供者は SNS URL（最大 5 つ）と補足情報をフォームで送信し、
紗代さんは管理画面で URL を訪問 → 投稿テキストを **手動でコピーして貼り付け** → Gemini で記事のたたき台を生成 → 編集して公開する。

紗代さんへの通知は **Gmail SMTP（Nodemailer）**、送信者への自動返信は **なし**（完了画面に「3 日以内にご連絡します」と表示するだけ）。

> 既存 `src/lib/ig-article-*` を最大限再利用する。
> プロンプト本文の入力ソースが「IG 投稿 1 件」から「自由テキスト最大 5 件 + 種別 + 画像」に変わる点だけが Phase 3B からの変化。

---

## 実装内容

### 1. 公開フォーム `/request/mini`

`src/app/(public)/request/mini/page.tsx`（新規, Server Component）+ `_components/MiniRequestForm.tsx`（Client Component）。

#### 1.1 ランディング（フォーム上部）

「寄り添う言葉」で受付窓口の趣旨を説明する。コピーは紗代さんと調整しつつ、最初の素案:

> 📩 ミニ記事のご相談
>
> 飯田下伊那の小さな出来事も、誰かに届くまで「無かったこと」になりがちです。
> SNS で発信されている情報があれば、URL を 1〜5 件ご共有ください。
> 紗代が記事に書き留めて、Sayo's Journal で紹介します。
>
> ※ 最大 5 つの URL から、1 つのミニ記事を作成します。
> ※ いただいたご連絡には、3 日以内にお返事します（電話または記載のメールアドレスへ）。
> ※ ミニ記事は無料です。

#### 1.2 フォーム入力項目

| 項目 | 型 | 必須 | バリデーション |
|------|-----|------|----------------|
| SNS URL 1〜5 | string[] | 1 つ以上必須 | URL 形式、最大 5 つ |
| 種別 | radio | 必須 | event / shop / group / other |
| 種別「その他」の補足 | text | other 選択時のみ | 最大 100 字 |
| 電話番号 | text | **必須** | 日本の電話番号形式（ハイフンあり / なし両対応） |
| メールアドレス | email | 任意 | RFC 準拠 |
| 公開希望時期 | radio | 必須 | お任せ / 期日指定 / 月指定 |
| 公開希望日 | date | 期日指定時 | 翌日以降 |
| 公開希望月 | month | 月指定時 | 当月以降 |
| 画像 | file[] | 任意 | 最大 2 枚、1 枚 10MB まで、JPEG/PNG/WebP/HEIC |
| 同意 | checkbox | **必須** | 「提供した情報を記事化することに同意します」 |

#### 1.3 スパム対策

- **Vercel BotID**（無料、ユーザーから見えない）を導入
- 電話番号必須（bot が嫌がるフィールド）
- Server Action 側で簡易レート制限（同一 IP から 5 分間に 3 件まで）

#### 1.4 送信フロー（Server Action）

`src/app/(public)/request/mini/actions.ts`:

```typescript
'use server'
export async function submitMiniInquiry(formData: FormData): Promise<{
  ok: true
} | {
  ok: false
  error: string
  fieldErrors?: Record<string, string>
}>
```

処理:
1. BotID 検証 + レート制限チェック
2. Zod でフォーム値をバリデーション
3. 画像を `inquiry-images/mini/{uuid}/{N}.{ext}` に Supabase Storage アップロード
4. `mini_inquiries` に INSERT
5. **Gmail SMTP** で紗代さんへ通知メール送信
6. 成功 → 完了画面（「3 日以内にご連絡します」）へリダイレクト

エラーは画面上にフィールド単位で表示。

#### 1.5 完了画面

`src/app/(public)/request/mini/thanks/page.tsx`:

> ご相談を受け付けました 🌿
>
> 3 日以内に、ご記入いただいた電話番号またはメールアドレスへ
> 紗代からご連絡いたします。
>
> もし急ぎのご相談でしたら、お電話でも承ります。
>
> [トップへ戻る]

---

### 2. メール通知（Gmail SMTP）

#### 2.1 依存パッケージ

```bash
npm install nodemailer
npm install -D @types/nodemailer
```

#### 2.2 環境変数（追加）

| 変数 | 必須 | 説明 |
|------|-----|------|
| `GMAIL_SMTP_USER` | 必須 | 送信元 Gmail アドレス（実装中: `rabo.hohoemi@gmail.com`、運用時: 紗代さんのメール） |
| `GMAIL_SMTP_APP_PASSWORD` | 必須 | Google アカウントの「アプリパスワード」（2 段階認証必須） |
| `INQUIRY_NOTIFY_TO` | 必須 | 通知先メールアドレス（紗代さんのメール） |

#### 2.3 ライブラリ

`src/lib/mailer.ts`（新規）:

```typescript
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_SMTP_USER!,
    pass: process.env.GMAIL_SMTP_APP_PASSWORD!,
  },
})

export async function sendInquiryNotification(input: {
  type: 'mini' | 'long'
  inquiryId: string
  summary: string
}): Promise<void> {
  const adminUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/admin/inquiries?tab=${input.type}&open=${input.inquiryId}`
  await transporter.sendMail({
    from: process.env.GMAIL_SMTP_USER!,
    to: process.env.INQUIRY_NOTIFY_TO!,
    subject: `[Sayo's Journal] 新しい${input.type === 'mini' ? 'ミニ記事' : 'ロング記事'}依頼が届きました`,
    text: `${input.summary}\n\n管理画面で確認: ${adminUrl}`,
  })
}
```

#### 2.4 エラー処理

メール送信失敗は **DB 保存失敗にしない**（送信エラーをログに記録するだけで Inquiry 自体は保存成功とする）。
理由: ユーザーは送信完了画面まで進めるべきで、メール失敗で再送信を強いるのは UX が悪い。

紗代さんは管理画面の未読バッジ（次節）で気づける。

---

### 3. 管理画面 — ミニ記事タブ拡張

Ticket 40 で枠だけ作った `MiniInquiriesList.tsx` の中身を実装する。

#### 3.1 一覧表

| カラム | 内容 |
|--------|------|
| 受付日 | created_at（相対表記: "3 時間前"） |
| 種別 | event / shop / group / other（バッジ） |
| URL 数 | sns_urls.length |
| 画像 | image_urls.length（サムネ表示） |
| 連絡先 | 電話番号 + メール（あれば） |
| 公開希望 | お任せ / 〜YYYY-MM-DD / YYYY-MM |
| ステータス | pending / generating / published / skipped |
| アクション | 「詳細を見る」「記事化する」「スキップ」 |

#### 3.2 フィルター

- ステータス（all / pending / generating / published / skipped）
- 種別（all / event / shop / group / other）
- ソート: 受付日（降順 / 昇順）

#### 3.3 未読バッジ

Sidebar の「依頼管理」項目に、`status='pending'` の件数を赤バッジで表示する。
（mini + long の合計件数）

Server Component で件数を取得し、Sidebar に props として渡す or Context で配信する。

#### 3.4 詳細ダイアログ

「詳細を見る」をクリックで以下を表示:
- 全フォーム入力内容（種別、URL、連絡先、画像プレビューなど）
- 内部メモ（admin_notes 編集可）
- ステータス変更ボタン

#### 3.5 ステータス操作

| アクション | 遷移 |
|------------|------|
| 「記事化する」 | pending → generating（記事化画面を開く） |
| 「スキップ」 | pending → skipped（理由を memo に記録） |
| 「未処理に戻す」 | skipped → pending |
| 「公開済みにする」 | （手動） generating → published（記事の紐付けが必要） |

`generated_post_id` が設定されたら自動的に `published` 扱いにする。

---

### 4. AI 記事化 UI

#### 4.1 ルート

`src/app/(admin)/admin/inquiries/[id]/generate/page.tsx`（新規）

> URL: `/admin/inquiries/{inquiry_id}/generate`
> ミニ記事の `inquiry_id` のみ対応（ロング記事はこの画面を使わない）

#### 4.2 画面構成

```
┌──────────────────────────────────────────────────────┐
│ ◀ 依頼一覧に戻る                                       │
│                                                       │
│ ミニ記事の AI 生成                                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                       │
│ 【提供された情報】                                     │
│ 種別: イベント                                         │
│ SNS URLs:                                              │
│   1. https://www.instagram.com/p/xxx/ [開く]          │
│   2. https://www.instagram.com/p/yyy/ [開く]          │
│   3. (未入力)                                          │
│   4. (未入力)                                          │
│   5. (未入力)                                          │
│                                                       │
│ 添付画像（2 枚）:                                      │
│ [サムネ1] [サムネ2]                                    │
│                                                       │
│ 連絡先: 0265-XX-XXXX / sample@example.com             │
│                                                       │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                       │
│ 【SNS 投稿テキストを貼り付け】                          │
│                                                       │
│ ▼ URL 1 の本文                                         │
│ ┌────────────────────────────────────────────────┐ │
│ │ (textarea: ここに貼り付け)                       │ │
│ └────────────────────────────────────────────────┘ │
│                                                       │
│ ▼ URL 2 の本文                                         │
│ ┌────────────────────────────────────────────────┐ │
│ │ (textarea)                                       │ │
│ └────────────────────────────────────────────────┘ │
│                                                       │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                       │
│ 【追加画像（任意・最大 8 枚）】                         │
│ ※ IG のスクショなどをここに追加できます                 │
│ [+ 画像を追加]                                         │
│                                                       │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                       │
│      [🤖 AI でたたき台を生成する]    [キャンセル]      │
└──────────────────────────────────────────────────────┘
```

#### 4.3 入力項目（紗代さんが手動で記入）

| 項目 | 型 | 必須 | 補足 |
|------|-----|------|------|
| URL N の本文 | text (textarea) | URL がある分は必須 | 入力された URL ごとに 1 つの textarea が表示される |
| 追加画像 | file[] | 任意 | 最大 8 枚（フォーム提供画像 + 追加で合計 10 枚程度を上限） |

#### 4.4 生成ボタンを押した後

1. `POST /api/admin/inquiries/[id]/generate` を呼ぶ
2. サーバー側で:
   - `mini_inquiries.status` を `generating` に更新
   - 追加画像があれば `inquiry-images/mini/{id}/additional_N.{ext}` にアップロード
   - 既存 `ig-article-generator` 系を流用して Gemini に投げる（プロンプトは後述）
   - 生成された記事を `posts` に INSERT（`is_published=false`）
   - `mini_inquiries.generated_post_id` を更新、`status='published'`
3. 完了したら `/admin/posts/{post_id}` にリダイレクト

---

### 5. プロンプト改修（`ig-article-prompt.ts` の汎用化）

既存 `buildArticleFromIgPrompt` は IG 投稿 1 件専用なので、ミニ記事用に拡張する。

#### 5.1 アプローチ

既存関数は残しつつ、**新規 `buildMiniArticlePrompt`** を `src/lib/mini-article-prompt.ts` に追加する。共通ロジック（JSON スキーマ定義、カテゴリリスト整形など）はヘルパー関数として切り出す。

```typescript
export function buildMiniArticlePrompt(input: {
  inquiryType: 'event' | 'shop' | 'group' | 'other'
  inquiryTypeOther: string | null  // 「その他」のとき
  snsTexts: Array<{ url: string; text: string }>  // 紗代さんが貼り付けた本文（最大 5）
  imageCount: number
  categories: Array<{ slug: string; name: string }>
  preferredPublishDate: string | null              // 公開希望日（あれば）
}): string
```

プロンプト本文の差分:

```
あなたは南信州（飯田市・下伊那地域）の地域情報を発信するライター「FUNE」です。

以下は、地域の方が「Sayo's Journal で紹介してほしい」と寄せてくださった
SNS 投稿の本文（最大 5 件）と種別情報です。
これらをひとつのミニ記事（短めの紹介記事）にまとめてください。

【重要】
- ミニ記事は無料公開される短い紹介記事です。長文にせず 400〜800 字程度
- セクション分割（h2 見出し）は使わず、1 本の流れる文章で書く
- 提供された SNS 本文の情報のみを使用し、捏造しない
- 複数 URL がある場合は、共通テーマを軸に統合する
- 種別に応じてトーンを調整:
    - event: 開催情報を先頭に（日付・場所・料金）
    - shop: お店の特徴・場所・営業情報
    - group: 団体の活動内容・連絡先
    - other: 内容に応じて柔軟に

【イベント情報の抽出】
種別が event のとき、is_event=true で event_date_start / venue / fee などを構造化抽出する
（既存 IG 記事生成と同じスキーマ）

【出力 JSON】
{
  "title": "...",
  "excerpt": "...",
  "content_html": "<p>...</p>",  // h2 不使用、p / a / strong のみ
  "recommended_category_slug": "...",
  "recommended_hashtags": ["...", ...],
  "event": { ... }  // 既存 Ticket 37 スキーマと同じ
}
```

#### 5.2 ミニ記事ではクレジット表記を **付けない**

理由:
- IG 投稿の再利用ではなく、地域の方が「掲載してください」と窓口に持ち込んだ情報
- 元 URL を引用するかどうかは紗代さんの判断（記事末尾に手動で追加すれば良い）
- ただし参照 URL は `posts.source_urls` のような形で内部保持しておくと、後の確認に便利

→ **追加 DB カラム**: `posts.source_urls text[]` を追加する。null 許容、ミニ記事生成時に `sns_urls` を保存。

```sql
ALTER TABLE posts ADD COLUMN source_urls text[];
```

#### 5.3 生成ライブラリ

`src/lib/mini-article-generator.ts`（新規）:

```typescript
export async function generateMiniArticle(input: {
  inquiryId: string
  snsTexts: Array<{ url: string; text: string }>  // 紗代さん入力
  additionalImageUrls: string[]                    // 追加アップロード分
}): Promise<{
  post_id: string
  is_event: boolean
}>
```

処理:
1. `mini_inquiries` を取得（status が `pending` または `generating` なら続行）
2. 既存カテゴリ一覧を取得
3. `buildMiniArticlePrompt` でプロンプト構築
4. Gemini 呼び出し（既存 `gemini.ts` 利用、JSON モード + リトライ 3 回）
5. JSON パース + Zod でバリデーション
6. slug 生成（既存 `slug-utils.ts` 流用、イベントなら `event-{date}-` プレフィックス）
7. **画像配置**: フォーム提供 2 枚 + 追加画像を全て本文に挿入（h2 なしなので冒頭に 1 枚、残りは本文末尾）
8. `posts` に INSERT（`is_published=false`, `source_urls=sns_urls`）
9. `post_categories` / `post_hashtags` を INSERT
10. `mini_inquiries.status='published'`, `generated_post_id=post_id` を更新

---

### 6. API ルート

`src/app/api/admin/inquiries/[id]/generate/route.ts`（新規）:

```typescript
export const maxDuration = 60

export async function POST(req: Request, { params }) {
  await assertAdminAuth()
  const body = await req.json()  // { snsTexts, additionalImageUrls }
  try {
    const result = await generateMiniArticle({
      inquiryId: params.id,
      snsTexts: body.snsTexts,
      additionalImageUrls: body.additionalImageUrls,
    })
    return Response.json({
      ok: true,
      post_id: result.post_id,
      redirect: `/admin/posts/${result.post_id}`,
    })
  } catch (err) {
    // status を pending に戻す
    return Response.json({ ok: false, error: ... }, { status: 400 })
  }
}
```

---

## ファイル構成

### 新規作成

```
supabase/migrations/
└── YYYYMMDD_add_posts_source_urls.sql

src/app/(public)/request/mini/
├── page.tsx                       # Server Component（ランディング + フォーム）
├── actions.ts                     # submitMiniInquiry
├── thanks/page.tsx                # 完了画面
└── _components/
    └── MiniRequestForm.tsx        # Client Component

src/app/(admin)/admin/inquiries/[id]/generate/
├── page.tsx                       # 記事化画面
└── _components/
    └── GenerateForm.tsx           # Client Component

src/app/api/admin/inquiries/[id]/generate/
└── route.ts

src/lib/
├── mailer.ts                      # Gmail SMTP
├── mini-article-prompt.ts         # プロンプト構築
└── mini-article-generator.ts      # 生成本体
```

### 編集

```
src/app/(admin)/admin/inquiries/page.tsx                # 詳細表示
src/app/(admin)/admin/inquiries/_components/MiniInquiriesList.tsx  # 一覧表 + アクション
src/app/(admin)/admin/inquiries/actions.ts              # ステータス更新等
src/components/admin/Sidebar.tsx                        # 未読バッジ
src/components/Header.tsx                               # CTA リンクを /request/mini に
src/lib/ig-article-prompt.ts                            # ヘルパー関数の切り出し（再利用しやすく）
.env.local.example                                      # GMAIL_SMTP_* / INQUIRY_NOTIFY_TO
```

---

## 完了条件

### 公開フォーム
- [×] `/request/mini` が表示され、寄り添うコピーが入っている
- [×] フォームの全 11 項目が入力できる（バリデーション含む）
- [×] 種別「その他」を選ぶと補足欄が表示される
- [×] 公開希望「期日指定」を選ぶと日付入力が表示される
- [×] 画像が 2 枚まで、各 10MB まで、JPEG/PNG/WebP/HEIC のみアップロードできる
- [×] 同意チェックが必須になっている
- [×] Vercel BotID が動作する
- [×] 送信成功で `mini_inquiries` に INSERT され、画像が Storage にアップロードされる
- [×] 完了画面が表示される（「3 日以内にご連絡します」）

### メール通知
- [×] `npm install nodemailer @types/nodemailer` が完了している
- [×] `.env.local.example` に GMAIL_SMTP_USER / GMAIL_SMTP_APP_PASSWORD / INQUIRY_NOTIFY_TO が追加されている
- [×] `src/lib/mailer.ts` で `sendInquiryNotification` が動作する
- [×] フォーム送信時に紗代さん（`rabo.hohoemi@gmail.com`）へメール通知が届く
- [×] メール本文に管理画面 URL が含まれる
- [×] メール送信失敗時も Inquiry の DB 保存は成功する

### 管理画面（ミニ記事タブ）
- [×] 一覧表に 8 つのカラムが表示される
- [×] フィルター（ステータス / 種別 / ソート）が動作する
- [×] Sidebar の「依頼管理」に未読バッジが表示される（pending 件数）
- [×] 詳細ダイアログで全項目が表示される
- [×] 内部メモ（admin_notes）が編集できる
- [×] ステータス操作（記事化する / スキップ / 未処理に戻す）が動作する

### AI 記事化画面
- [×] `/admin/inquiries/{id}/generate` が表示される
- [×] フォーム提供情報（種別 / URL / 画像 / 連絡先）が読み取り専用で表示される
- [×] 各 URL に対応する textarea が表示される
- [×] 「追加画像」アップロードが動作する（最大 8 枚）
- [×] 「AI でたたき台を生成する」ボタンで生成 API が呼ばれる
- [×] 生成成功で `/admin/posts/{post_id}` にリダイレクトされる
- [×] 生成失敗で `mini_inquiries.status` が `pending` に戻される

### 生成ロジック
- [×] `buildMiniArticlePrompt` がプロンプトを正しく構築する（種別ごとのトーン指定含む）
- [×] Gemini 呼び出しが 3 回まで自動リトライする
- [×] JSON パース + Zod バリデーションが動作する
- [×] 種別=event のとき is_event=true でイベント情報が抽出される
- [×] 生成記事は `is_published=false` で保存される
- [×] `posts.source_urls` に元 SNS URL 配列が保存される
- [×] 画像が記事本文に挿入される（フォーム提供 + 追加分）
- [×] サムネイル（`thumbnail_url`）に 1 枚目の画像が設定される
- [×] 推奨カテゴリ / ハッシュタグが INSERT される
- [×] `mini_inquiries.status='published'`, `generated_post_id=post_id` が更新される

### 削除/共通
- [×] `posts.source_urls` カラムが追加されている（本番 Supabase に適用済み）
- [×] 既存 IG 記事生成（`generateArticleFromIg`）は削除または明示的に「不使用」とコメント
- [×] `.claude/rules/implementation-status.md` が更新されている

### ビルド
- [×] `npm run build` が成功する
- [×] `npm run lint` がエラーなしで通る

---

## 紗代さんの画面確認ポイント

1. **`/request/mini`**: スマホで開いて、フォームが入力しやすいか
2. **メール通知**: 自分でテスト送信して、紗代さんのメールに届くか
3. **管理画面**: 受付した依頼が一覧で見えるか、ステータス操作ができるか
4. **記事化画面**: SNS 投稿の本文を貼り付けて生成 → 記事編集画面に遷移するか
5. **生成結果**: タイトル・本文・カテゴリ・タグ・画像が妥当か、イベント情報が抽出されているか

---

## 将来の検討事項（本チケットスコープ外）

- スマホからフォーム送信時の HEIC → JPEG 自動変換
- 画像の AI による自動 alt text 生成
- 「ミニ記事一覧」公開ページ（カテゴリ別とは別軸で「ミニ記事だけ」を一覧表示）
- メール通知失敗時のリトライキュー（Vercel Queues）
