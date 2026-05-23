# Ticket 40: 情報窓口フォーム共通基盤 + 既存 IG 取り込み機能の削除

> **フェーズ**: Phase 4（情報窓口フォーム導入）
> **依存**: なし（既存 Phase 3B 機能の置き換え）
> **ブロック**: 41（ミニ記事フロー）, 42（ロング記事 CRM）

---

## 概要

Sayo's Journal の「3 つの柱」のうち、**ミニ記事 / ロング記事の情報受付窓口** の共通基盤を整備する。
本チケットでは以下の 4 つを行う:

1. **DB スキーマ**: ミニ記事依頼 / ロング記事依頼の 2 テーブル + Storage バケットを作成
2. **管理画面の枠組み**: `/admin/inquiries`（依頼管理）を新設、ミニ / ロングのタブ切替で表示
3. **公開側の導線**: ヘッダーと About ページに「情報を届ける / 取材を依頼する」ボタンを追加
4. **既存 IG 取り込み機能の削除**: `sources` / `imports` / `imports/upload` 系のページ・API・DB テーブルを削除し、`/admin/instagram/posts`（ブログ→IG 投稿管理）と `src/lib/ig-article-*`（ミニ記事で再利用）は残す

> 公開フォーム本体と AI たたき台生成は **Ticket 41**、案件管理 CRM は **Ticket 42** で実装する。
> 本チケットは「枠組みと削除」までを担当する。

---

## 背景：3 つの柱（紗代さんの想い）

Sayo's Journal は以下の 3 種類の記事で構成される:

| 区分 | 内容 | 料金 |
|------|------|------|
| **自由記事** | 紗代さん本人が自由に書く既存記事 | 無料 |
| **ミニ記事** | 情報窓口フォームから SNS URL + 補足情報をもらい、紗代さんが AI 補助でたたき台を作って公開する短い記事 | 無料 |
| **ロング記事** | クライアントからの取材依頼で、紗代さんが直接取材して書く記事 | 有料（500円〜） |

「飯田下伊那の人は困ったことを人に頼るのが苦手」という地域性に寄り添い、
「役所より気軽、SNS より責任ある場所」というポジションを目指す。

---

## 実装内容

### 1. DB スキーマ

`mini_inquiries` と `long_inquiries` を **別テーブル** として作成する。
共通フィールドはあるが、ミニ・ロングで必要な情報が大きく異なるため、テーブル分離の方が型安全 + UI も書きやすい。

#### 1.1 mini_inquiries（ミニ記事依頼）

```sql
CREATE TABLE mini_inquiries (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- フォーム入力内容
  sns_urls            text[] NOT NULL DEFAULT '{}',  -- 最大 5 つ
  inquiry_type        text NOT NULL                  -- event/shop/group/other
    CHECK (inquiry_type IN ('event', 'shop', 'group', 'other')),
  inquiry_type_other  text,                          -- type='other' のとき補足
  phone               text NOT NULL,
  email               text,
  publish_preference  text NOT NULL                  -- お任せ / 期日指定 / 月指定
    CHECK (publish_preference IN ('anytime', 'by_date', 'in_month')),
  publish_target_date date,                          -- by_date のとき
  publish_target_month text,                         -- in_month のとき "2026-06"
  image_urls          text[] NOT NULL DEFAULT '{}',  -- inquiry-images バケットの URL（最大 2）
  consent             boolean NOT NULL DEFAULT false,

  -- 運用ステータス
  status              text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'generating', 'published', 'skipped')),
  admin_notes         text,                          -- 紗代さんの内部メモ
  generated_post_id   uuid REFERENCES posts(id) ON DELETE SET NULL,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mini_inquiries_status     ON mini_inquiries(status);
CREATE INDEX idx_mini_inquiries_created_at ON mini_inquiries(created_at DESC);
```

#### 1.2 long_inquiries（ロング記事依頼）

```sql
CREATE TABLE long_inquiries (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 種別と名称（種別で必須項目が変わる）
  client_type         text NOT NULL                  -- individual/organization/group
    CHECK (client_type IN ('individual', 'organization', 'group')),
  individual_name     text,                          -- individual のとき必須
  organization_name   text,                          -- organization のとき必須（貴社名）
  department_name     text,                          -- organization のとき任意（部署名）
  group_name          text,                          -- group のとき必須
  contact_person      text NOT NULL,                 -- 担当者名（全種別で必須）

  -- 取材内容
  address             text NOT NULL,
  interview_content   text NOT NULL,                 -- フリーテキスト
  publish_preference  text,                          -- 公開希望時期（フリーテキスト or 選択肢）
  interview_preference text,                         -- 取材希望時期（フリーテキスト）

  -- 連絡先
  phone               text NOT NULL,
  email               text,
  consent             boolean NOT NULL DEFAULT false,

  -- 案件管理ステータス
  status              text NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',        -- 受付
      'contacted',      -- 連絡済
      'scheduled',      -- 取材日確定
      'interviewed',    -- 取材実施
      'writing',        -- 執筆中
      'published',      -- 公開済み
      'cancelled'       -- キャンセル
    )),
  admin_notes         text,                          -- 紗代さんの内部メモ
  generated_post_id   uuid REFERENCES posts(id) ON DELETE SET NULL,
  scheduled_at        timestamptz,                   -- 取材日（確定時に入る）
  fee_amount          integer,                       -- 確定後の金額（円）

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_long_inquiries_status       ON long_inquiries(status);
CREATE INDEX idx_long_inquiries_scheduled_at ON long_inquiries(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX idx_long_inquiries_created_at   ON long_inquiries(created_at DESC);
```

#### 1.3 RLS ポリシー

両テーブルとも RLS を有効化:
- **INSERT**: 匿名ユーザーを許可（公開フォームから書き込みのため）
- **SELECT / UPDATE / DELETE**: authenticated のみ

```sql
ALTER TABLE mini_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert mini_inquiries" ON mini_inquiries
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can read/update/delete mini_inquiries" ON mini_inquiries
  FOR ALL USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');

-- updated_at トリガー
CREATE TRIGGER trg_mini_inquiries_updated_at
  BEFORE UPDATE ON mini_inquiries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

`long_inquiries` も同じパターン。

> **スパム対策**: INSERT 匿名許可だが、Vercel BotID + 電話番号必須で実質的な人間フィルタとする。
> （詳細は Ticket 41 / 42 のフォーム実装で対応）

#### 1.4 Storage バケット

新規バケット `inquiry-images`（public 読取、authenticated 書込）を作成:
- パス: `mini/{inquiry_id}/{1|2}.{ext}` または `long/{inquiry_id}/{n}.{ext}`
- 原本をそのまま保存（最大 10MB）。表示時は Next.js Image による自動圧縮

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('inquiry-images', 'inquiry-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can read inquiry-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'inquiry-images');

CREATE POLICY "Anyone can upload to inquiry-images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'inquiry-images');

CREATE POLICY "Authenticated can update/delete inquiry-images" ON storage.objects
  FOR ALL USING (bucket_id = 'inquiry-images' AND (select auth.role()) = 'authenticated');
```

> 匿名 INSERT 許可は **フォーム送信時の画像アップロード** を想定。
> サイズ / ファイルタイプ制限は Server Action 側でも検証する（Storage Policy だけでは MIME / サイズチェック不可）。

---

### 2. 管理画面 `/admin/inquiries` の枠組み

```
src/app/(admin)/admin/inquiries/
├── page.tsx                       # 一覧（タブ切替: ?tab=mini | ?tab=long、default=mini）
├── _components/
│   ├── InquiriesTabs.tsx          # タブ切替リンク（Server Component）
│   ├── MiniInquiriesList.tsx      # ミニ記事の一覧表（Ticket 41 で詳細実装）
│   └── LongInquiriesList.tsx      # ロング記事の一覧表（Ticket 42 で詳細実装）
└── actions.ts                     # 共通の Server Actions（Ticket 41/42 で拡張）
```

本チケットでは **「タブ切替 + 空っぽの表 + 件数表示」** までを実装する。
カードや詳細ダイアログ、ステータス操作などは 41/42 で追加する。

#### 2.1 Sidebar 更新

`src/components/admin/Sidebar.tsx`:

```typescript
// 削除
const instagramNavigation = [
  { name: 'IG 投稿管理', href: '/admin/instagram/posts', icon: Send },
  { name: '取得先アカウント', href: '/admin/instagram/sources', icon: Users },  // 削除
  { name: '取得投稿', href: '/admin/instagram/imports', icon: Inbox },          // 削除
]

// 追加（新セクション「依頼管理」）
const inquiriesNavigation = [
  { name: '依頼管理', href: '/admin/inquiries', icon: MessageSquare },  // または HelpingHand
]
```

セクション順序: ダッシュボード/記事/カテゴリ/ハッシュタグ/メディア → **依頼管理** → IG 投稿管理 → AI

---

### 3. 公開側の導線

#### 3.1 ヘッダー

`src/components/Header.tsx`（既存）にボタンを追加。
PC/SP の両方で表示位置を決める。デザイン詳細は実装時に紗代さんに確認しつつ。

提案:
- PC: ヘッダー右側に「📩 情報を届ける」「✍️ 取材を依頼する」の 2 ボタン
- SP: ハンバーガーメニュー内に同じ 2 リンク

#### 3.2 About ページ

`src/app/(public)/about/page.tsx`（既存）の末尾、または既存の「お問い合わせ CTA」を置き換える形で:

- 「3 つの記事区分」の説明セクション（自由記事 / ミニ記事 / ロング記事）
- 各記事区分に対応する CTA ボタン:
  - 「📩 ミニ記事の情報を届ける」→ `/request/mini`
  - 「✍️ 取材を依頼する」→ `/request/long`

詳細コピーは「寄り添う言葉」で。提案例:

> 飯田下伊那は、誰かに頼ることが少し苦手な土地。
> でも、伝えたい想い、知ってほしいお店、来てほしいイベントがあるなら、
> ここに書き留めてみませんか。紗代が、あなたの代わりに言葉にします。

最終コピーは紗代さんと相談して調整する。

---

### 4. 既存 IG 取り込み機能の削除

#### 4.1 削除対象

**ページ・コンポーネント**:
- `src/app/(admin)/admin/instagram/sources/` 配下すべて
- `src/app/(admin)/admin/instagram/imports/` 配下すべて（`upload/` 含む）

**API ルート**:
- `src/app/api/admin/instagram/sources/route.ts`
- `src/app/api/admin/instagram/sources/[id]/route.ts`
- `src/app/api/admin/instagram/imports/route.ts`
- `src/app/api/admin/instagram/imports/[id]/route.ts`
- `src/app/api/admin/instagram/imports/[id]/generate/route.ts`（Ticket 41 でミニ記事用に再実装するためここでは削除 OK）

**ライブラリ**:
- `src/lib/ig-csv-parser.ts` — Cowork CSV パース、不要
- `src/lib/ig-import-storage.ts` — Cowork 画像 Storage、不要

**DB テーブル**（マイグレーションで DROP）:
- `ig_sources`
- `ig_imported_posts`

**Storage バケット**:
- `ig-imported` バケット — 中のファイルごと削除（記事に既に使われている画像は `thumbnails` に既にコピー...されてない場合は注意）

> ⚠️ **重要な確認事項**: Ticket 37 で生成された既存の記事は、`ig-imported` バケットの画像 URL を直接参照している可能性がある。
> バケット削除前に、本番 DB を確認して「`ig-imported` を参照している `posts` レコードが存在するか」をチェックし、存在すれば該当画像を `thumbnails` バケットへ移行してから削除する。
> 開発時には `posts` テーブルに対して `SELECT id, title FROM posts WHERE thumbnail_url LIKE '%ig-imported%' OR content LIKE '%ig-imported%';` を実行して確認する。

#### 4.2 残す（ミニ記事フローで再利用）

**ページ**:
- `src/app/(admin)/admin/instagram/posts/` 配下すべて — ブログ→IG 投稿管理（Ticket 31, 32）

**API ルート**:
- `src/app/api/admin/instagram/posts/route.ts`
- `src/app/api/admin/instagram/posts/[id]/route.ts`
- `src/app/api/admin/instagram/generate/route.ts`

**ライブラリ**:
- `src/lib/ig-article-prompt.ts` — Gemini プロンプト（**Ticket 41 でミニ記事用に拡張**）
- `src/lib/ig-article-generator.ts` — 記事生成本体（**Ticket 41 で入力ソースを差し替え**）
- `src/lib/ig-article-images.ts` — 画像挿入ロジック
- `src/lib/ig-article-credit.ts` — クレジット表記
- `src/lib/ig-caption-prompt.ts` / `ig-caption-generator.ts` — ブログ→IG キャプション生成
- `src/lib/ig-settings.ts` / `ig-auto-generator.ts` — IG 自動生成設定
- `src/lib/post-sections.ts` — 記事セクション分割
- `src/lib/slug-utils.ts` — slug 生成

**DB テーブル**:
- `ig_posts`（ブログ→IG）
- `ig_settings`

#### 4.3 削除の段取り（紗代さん画面確認のため）

紗代さんが画面で削除を確認できるよう、以下の順で commit を分ける:

1. **commit 1**: DB マイグレーション（`mini_inquiries` / `long_inquiries` / `inquiry-images` バケット作成）+ 既存 IG 取り込みテーブルの DROP
2. **commit 2**: 既存 IG 取り込みページ・API・ライブラリの削除（Sidebar からリンク撤去）
3. **commit 3**: `/admin/inquiries` の枠組み（タブ切替 + 空テーブル）+ Sidebar への追加
4. **commit 4**: 公開側ヘッダー / About ページの導線追加

各 commit 後に `npm run dev` で動作確認し、紗代さんに見てもらえる状態にする。

---

## ファイル構成

### 新規作成

```
supabase/migrations/
└── YYYYMMDDHHMMSS_create_inquiries_tables.sql

src/app/(admin)/admin/inquiries/
├── page.tsx
├── actions.ts
└── _components/
    ├── InquiriesTabs.tsx
    ├── MiniInquiriesList.tsx       # 枠のみ
    └── LongInquiriesList.tsx       # 枠のみ

src/lib/
└── inquiries.ts                    # 共通の型定義 + Supabase ヘルパー
```

### 編集

```
src/components/admin/Sidebar.tsx
src/components/Header.tsx           # PC/SP に CTA ボタン追加
src/app/(public)/about/page.tsx     # 3 つの柱の説明 + CTA
.claude/rules/database.md           # mini_inquiries / long_inquiries の説明追加 + ig_sources/ig_imported_posts 削除
.claude/rules/implementation-status.md  # Ticket 34/35/36 を削除済み扱いに更新
CLAUDE.md                           # URL 構造の更新
```

### 削除

```
src/app/(admin)/admin/instagram/sources/    # 配下すべて
src/app/(admin)/admin/instagram/imports/    # 配下すべて（upload/ 含む）
src/app/api/admin/instagram/sources/
src/app/api/admin/instagram/imports/

src/lib/ig-csv-parser.ts
src/lib/ig-import-storage.ts
```

---

## 完了条件

### DB
- [×] `mini_inquiries` テーブルが作成されている（10 カラム + status + admin_notes + generated_post_id）
- [×] `long_inquiries` テーブルが作成されている（種別別フィールド + 取材内容 + 7 つのステータス）
- [×] 両テーブルに RLS が有効化されている（authenticated 限定の ALL ポリシー。フォーム送信は Server Action から service role で書き込むため匿名 INSERT ポリシーは付けない方針に変更）
- [×] `inquiry-images` Storage バケットが作成され、適切な Policy が適用されている
- [×] `ig_sources` / `ig_imported_posts` テーブルが DROP されている
- [×] `ig-imported` バケットが削除されている（参照記事の事前移行を含む）

### 削除
- [×] `/admin/instagram/sources/*` のページ・コンポーネントが削除されている
- [×] `/admin/instagram/imports/*`（`upload/` 含む）が削除されている
- [×] 関連 API ルート 5 つが削除されている
- [×] `src/lib/ig-csv-parser.ts` / `ig-import-storage.ts` が削除されている
- [×] Sidebar から「取得先アカウント」「取得投稿」が削除されている

### 残存確認
- [×] `/admin/instagram/posts` が引き続き動作する
- [×] `src/lib/ig-article-*.ts` が残っている（Ticket 41 で利用予定）
- [×] `ig_posts` / `ig_settings` テーブルが残っている

### 管理画面
- [×] `/admin/inquiries` が表示される（タブ切替 + 空テーブル + 件数表示）
- [×] Sidebar に「依頼管理」が追加されている

### 公開側
- [×] ヘッダー（PC/SP）に「情報を届ける」「取材を依頼する」の 2 ボタンが表示される
- [×] About ページに 3 つの柱の説明 + CTA ボタンが追加されている

### ドキュメント
- [×] `CLAUDE.md` の URL 構造が更新されている
- [×] `.claude/rules/database.md` が更新されている
- [×] `.claude/rules/implementation-status.md` が更新されている

### ビルド
- [×] `npm run build` が成功する
- [×] `npm run lint` がエラーなしで通る

---

## 紗代さんの画面確認ポイント

実装後、以下を紗代さんに確認してもらう:
1. **管理画面の Sidebar**: 「取得先アカウント」「取得投稿」が消えていて、「依頼管理」が追加されている
2. **`/admin/inquiries`**: ミニ / ロングのタブが表示される（中身は空）
3. **`/admin/instagram/posts`**: 既存のブログ→IG 投稿管理は変わらず動く
4. **公開側ヘッダー**: 「情報を届ける」「取材を依頼する」ボタンが目立つ位置にある
5. **About ページ**: 3 つの柱の説明 + 寄り添うコピー + CTA が表示される
6. **既存記事のサムネイル**: Ticket 37 で生成された記事のサムネイルが壊れていない
