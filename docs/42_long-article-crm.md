# Ticket 42: ロング記事フロー（取材依頼フォーム + 案件管理 CRM）

> **フェーズ**: Phase 4
> **依存**: 40（共通基盤 + IG 削除）, 41（共通基盤 — メール通知ライブラリ `mailer.ts` を流用）
> **ブロック**: なし

---

## 概要

「3 つの柱」のうち、有料（500円〜）のロング記事フローを実装する。
クライアント（個人 / 組織 / 団体）が取材依頼フォームから連絡 → 紗代さんが管理画面で案件を進捗管理 → 紗代さん本人が取材 → 記事を書いて公開、までを支援する。

AI による記事生成は行わない（紗代さん本人が現地取材して書くため）。
本チケットは **案件管理 CRM** を中心に実装する。

支払い・金額確定は個別連絡 + 手動運用（最初は振込 / 請求書 / 現金の 3 通り対応）。Stripe 等の決済導入は将来検討。

---

## 実装内容

### 1. 公開フォーム `/request/long`

`src/app/(public)/request/long/page.tsx`（新規, Server Component）+ `_components/LongRequestForm.tsx`（Client Component）。

#### 1.1 ランディング

> ✍️ 取材依頼のご相談
>
> 「うちの活動を、紗代さんに直接取材して書いてほしい」
> そんなご要望にお応えするための窓口です。
>
> いただいた内容をもとに、紗代から個別にご連絡し、
> 取材日程・公開時期・料金（500 円〜）を一緒に決めさせていただきます。
>
> ※ 取材記事は有料です。金額はご依頼内容に応じて個別にご相談します。
> ※ 3 日以内にお返事します。
> ※ お電話でのご相談も歓迎します。

#### 1.2 フォーム入力項目

種別（client_type）に応じて必須項目を切り替える。

**共通項目（全種別必須）**:
| 項目 | 型 | 必須 |
|------|-----|------|
| 種別 | radio | 必須（個人 / 組織 / 団体） |
| 担当者名 | text | 必須 |
| 住所 | text | 必須 |
| 取材内容 | textarea | 必須（200〜2000 字） |
| 公開希望時期 | text | 任意（フリー入力） |
| 取材希望時期 | text | 任意（フリー入力） |
| 電話番号 | text | **必須** |
| メールアドレス | email | 任意 |
| 同意 | checkbox | **必須**（「提供した情報を取材・記事化することに同意します」） |

**種別ごとの追加項目**:
| 種別 | 追加項目 |
|------|---------|
| 個人 | 氏名（必須） |
| 組織 | 貴社名（必須）、部署名（任意） |
| 団体 | 団体名（必須） |

→ UI 実装: 種別ラジオの選択に応じて、フォーム下部に該当項目が表示される（React state で条件分岐）。

#### 1.3 スパム対策

- Vercel BotID
- 電話番号必須
- Server Action 側のレート制限（5 分間に 3 件まで / 同一 IP）

#### 1.4 送信フロー（Server Action）

`src/app/(public)/request/long/actions.ts`:

```typescript
'use server'
export async function submitLongInquiry(formData: FormData): Promise<ActionResult>
```

処理:
1. BotID 検証 + レート制限
2. Zod でバリデーション（種別ごとの必須項目を出し分け）
3. `long_inquiries` に INSERT
4. Gmail SMTP で紗代さんへ通知メール送信（`mailer.ts` の `sendInquiryNotification` を流用）
5. 完了画面へリダイレクト

#### 1.5 完了画面

`src/app/(public)/request/long/thanks/page.tsx`:

> ご相談ありがとうございます ✍️
>
> 3 日以内に、ご記入いただいた電話番号またはメールアドレスへ
> 紗代から個別にご連絡いたします。
> 取材日程と料金は、内容に応じてご相談させてください。
>
> [トップへ戻る]

---

### 2. 管理画面 — ロング記事タブ拡張

Ticket 40 で枠だけ作った `LongInquiriesList.tsx` を実装する。

#### 2.1 一覧表

| カラム | 内容 |
|--------|------|
| 受付日 | created_at（相対表記） |
| 種別 | 個人 / 組織 / 団体（バッジ） |
| 依頼者 | 種別に応じて 氏名 / 貴社名 + 部署 / 団体名 |
| 担当者 | contact_person |
| 取材内容（要約） | interview_content の冒頭 60 字 + … |
| 公開希望 / 取材希望 | 自由テキストをそのまま |
| ステータス | pending / contacted / scheduled / interviewed / writing / published / cancelled |
| アクション | 「詳細」「ステータス変更」 |

#### 2.2 フィルター

- ステータス（all / 各ステータス）
- 種別（all / individual / organization / group）
- ソート: 受付日 / scheduled_at（取材日）

#### 2.3 詳細ダイアログ

クリックで以下を表示:

```
┌─────────────────────────────────────────────────────┐
│ ロング記事依頼 — #abc12345                            │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                     │
│ 種別: 組織  | 受付日: 2026-05-17 14:30              │
│                                                     │
│ 貴社名: 株式会社サンプル                              │
│ 部署: 広報部                                         │
│ 担当者: 山田太郎                                     │
│ 住所: 長野県飯田市...                                │
│ 電話: 0265-XX-XXXX                                  │
│ メール: yamada@example.com                          │
│                                                     │
│ 公開希望時期: 来月中旬                                │
│ 取材希望時期: 平日午後                                │
│                                                     │
│ 【取材内容】                                          │
│ （複数行のフリーテキスト）                             │
│                                                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                     │
│ 【案件管理】                                          │
│                                                     │
│ ステータス: [pending ▼]  ステータス更新               │
│   ⤷ 変更履歴（最新 5 件）                             │
│                                                     │
│ 取材日: [____年__月__日 __:__] 更新                   │
│ 金額: [____] 円  更新                                │
│ 紐付け記事: [posts から選択 ▼] or 新規作成            │
│                                                     │
│ 【内部メモ】                                          │
│ ┌─────────────────────────────────────────────┐ │
│ │ (admin_notes textarea)                          │ │
│ └─────────────────────────────────────────────┘ │
│ メモを保存                                           │
│                                                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ [削除]                                  [閉じる]    │
└─────────────────────────────────────────────────────┘
```

#### 2.4 ステータスフロー

```
pending（受付）
   ↓
contacted（連絡済）
   ↓
scheduled（取材日確定） — scheduled_at を記録
   ↓
interviewed（取材実施）
   ↓
writing（執筆中） — 記事を新規作成 or 既存記事を紐付け（generated_post_id）
   ↓
published（公開済み） — 記事の is_published=true に紐付き
```

途中で `cancelled` へ遷移可能。

紗代さんが「ステータスを進める」と、`updated_at` が更新される。
詳細な変更履歴は最初は実装しない（必要になれば後続チケットで追加）。

#### 2.5 記事との紐付け

- ステータスが `writing` 以降になったら「紐付け記事」のセレクトボックスを有効化
- 既存記事一覧から選択 or 「新規作成」で `/admin/posts/new?from_inquiry=long&id=...` へ遷移
- 紐付けた `posts.id` を `long_inquiries.generated_post_id` に保存
- 紐付け先記事が `is_published=true` になったら、`long_inquiries.status` を自動で `published` に更新（DB トリガー or アプリ側）

> アプリ側で処理する方が DB トリガーよりデバッグしやすいので、Server Action 内で実装する。

#### 2.6 金額管理

- `fee_amount` カラム（integer, 円）
- 詳細ダイアログから入力 / 編集可能
- 一覧表には表示しない（個人情報的な扱い）
- 将来 Stripe 連携時はこの値を元に決済リンクを生成する

---

### 3. メール通知

Ticket 41 で実装した `src/lib/mailer.ts` の `sendInquiryNotification` を流用する:

```typescript
await sendInquiryNotification({
  type: 'long',
  inquiryId: inquiry.id,
  summary: `${client_type} / ${contact_person} 様からのロング記事依頼が届きました`,
})
```

メールから直接管理画面の該当案件を開けるよう、URL は `?tab=long&open={inquiry_id}` 形式にする。

---

### 4. ロング記事専用の表示要素（公開側）

#### 4.1 公開記事ページのバッジ

ロング記事（`long_inquiries.generated_post_id` で紐付いた `posts`）には、
紗代さんが直接取材した記事であることを示すバッジを表示する。

実装:
- `posts.article_type text NOT NULL DEFAULT 'free'`（free / mini / long）カラムを追加
- 公開記事ページのヘッダー部分に、`article_type` に応じてバッジを表示
  - `free`: バッジなし（既存記事）
  - `mini`: 「📩 ミニ記事」バッジ
  - `long`: 「✍️ 取材記事」バッジ

```sql
ALTER TABLE posts
  ADD COLUMN article_type text NOT NULL DEFAULT 'free'
    CHECK (article_type IN ('free', 'mini', 'long'));
```

- Ticket 41 でミニ記事を生成するとき: `article_type='mini'` をセット
- Ticket 42 でロング記事を新規作成するとき: `article_type='long'` をセット
- 既存記事は `article_type='free'`（デフォルト値）

> このバッジは「Sayo's Journal の透明性」のために重要。
> 読者から見て「これは紗代さんが直接取材した記事だ」とわかると、有料情報としての信頼性が上がる。

#### 4.2 ロング記事の公開済み一覧（将来検討、本チケットスコープ外）

`article_type='long'` で絞り込んだ「取材記事だけ」のページが将来欲しくなるかも。
本チケットでは実装せず、必要になったら追加する。

---

### 5. API ルート / Server Actions

`src/app/(admin)/admin/inquiries/actions.ts` に追加:

```typescript
'use server'

export async function updateLongInquiryStatus(
  id: string,
  status: LongInquiryStatus,
  options?: { scheduledAt?: string; feeAmount?: number; postId?: string }
): Promise<ActionResult>

export async function updateLongInquiryNotes(
  id: string,
  notes: string
): Promise<ActionResult>

export async function deleteLongInquiry(id: string): Promise<ActionResult>

export async function linkInquiryToPost(
  inquiryId: string,
  postId: string
): Promise<ActionResult>
```

API ルートは Server Actions で十分なので新規作成しない。

---

## ファイル構成

### 新規作成

```
supabase/migrations/
└── YYYYMMDD_add_posts_article_type.sql

src/app/(public)/request/long/
├── page.tsx                       # Server Component
├── actions.ts                     # submitLongInquiry
├── thanks/page.tsx                # 完了画面
└── _components/
    └── LongRequestForm.tsx        # Client Component（種別による出し分け）

src/components/
└── ArticleTypeBadge.tsx           # 公開記事ページのバッジ
```

### 編集

```
src/app/(admin)/admin/inquiries/page.tsx
src/app/(admin)/admin/inquiries/_components/LongInquiriesList.tsx
src/app/(admin)/admin/inquiries/_components/LongInquiryDetailDialog.tsx  # 新規
src/app/(admin)/admin/inquiries/actions.ts                      # ロング用アクション追加
src/components/Header.tsx                                       # CTA に /request/long を追加
src/app/(public)/[category]/[slug]/page.tsx                     # ArticleTypeBadge を表示
.claude/rules/database.md                                       # article_type 追加
```

---

## 完了条件

### 公開フォーム
- [ ] `/request/long` が表示され、寄り添うコピーが入っている
- [ ] 種別ラジオで個人 / 組織 / 団体を選択できる
- [ ] 種別に応じて必須項目が出し分けられる
  - 個人: 氏名
  - 組織: 貴社名（必須）+ 部署名（任意）
  - 団体: 団体名
- [ ] 担当者名 / 住所 / 取材内容 / 電話 / 同意 が全種別で必須
- [ ] 公開希望 / 取材希望 がフリー入力できる
- [ ] Vercel BotID が動作する
- [ ] 送信成功で `long_inquiries` に INSERT される
- [ ] 紗代さんへの通知メールが届く
- [ ] 完了画面が表示される

### 管理画面（ロング記事タブ）
- [ ] 一覧表に 8 つのカラムが表示される
- [ ] フィルター（ステータス / 種別 / ソート）が動作する
- [ ] 詳細ダイアログで全項目が表示される
- [ ] ステータスを 7 段階で進められる（pending → ... → published / cancelled）
- [ ] 取材日（scheduled_at）が入力・編集できる
- [ ] 金額（fee_amount）が入力・編集できる
- [ ] 内部メモ（admin_notes）が編集できる
- [ ] 既存記事を紐付けられる（generated_post_id）
- [ ] 「新規記事を作成」ボタンで `/admin/posts/new?from_inquiry=long&id=...` へ遷移する
- [ ] 紐付けた記事が `is_published=true` になったら、`long_inquiries.status='published'` に自動更新される

### 公開側
- [ ] `posts.article_type` カラムが追加されている（free / mini / long）
- [ ] 公開記事ページに `ArticleTypeBadge` が表示される
- [ ] Ticket 41 のミニ記事生成時に `article_type='mini'` がセットされる（Ticket 41 側で対応）
- [ ] ロング記事新規作成時に `article_type='long'` がセットされる
- [ ] 既存記事は `article_type='free'` がデフォルトで適用される

### 共通
- [ ] ヘッダーの「取材を依頼する」ボタンが `/request/long` にリンクする
- [ ] Sidebar の「依頼管理」未読バッジに long の pending 件数が含まれる（41 と合算）

### ビルド
- [ ] `npm run build` が成功する
- [ ] `npm run lint` がエラーなしで通る

---

## 紗代さんの画面確認ポイント

1. **`/request/long`**: 種別を切り替えると必須項目が変わるか
2. **メール通知**: ロング記事依頼でも通知が届くか
3. **詳細ダイアログ**: ステータスを段階的に進められるか、取材日や金額が記録できるか
4. **記事との紐付け**: 取材後に書いた記事を依頼レコードと紐付けられるか
5. **公開記事のバッジ**: 「📩 ミニ記事」「✍️ 取材記事」が記事ページに表示されるか
6. **無料記事**: 既存記事にバッジが付かない（`article_type='free'` のデフォルト）

---

## 将来の検討事項（本チケットスコープ外）

- Stripe / Pay.jp による決済自動化
- 取材日リマインダー（前日にメール通知）
- ステータス変更履歴の保存・表示
- ロング記事だけを一覧表示する公開ページ
- 案件カレンダー表示（scheduled_at を月間ビューで）
- 請求書 PDF 自動生成
