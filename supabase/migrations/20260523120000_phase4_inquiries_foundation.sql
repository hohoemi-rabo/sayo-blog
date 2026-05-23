-- Phase 4: 情報窓口フォーム共通基盤 + 既存 IG 取り込み機能の削除 (Ticket 40 commit 1)
--
-- 1. mini_inquiries / long_inquiries テーブル作成
-- 2. inquiry-images Storage バケット作成
-- 3. 既存 IG 取り込みテストデータ削除 (下書き 2 件 + ig-imported バケット)
-- 4. ig_imported_posts / ig_sources テーブル DROP
--
-- 削除データのバックアップ: supabase/backups/20260523_phase4_ig_imports_backup.md
--
-- 設計メモ: フォーム送信は Server Action から service role で書き込むため、
-- inquiries テーブルには匿名 INSERT ポリシーを付けない (authenticated のみ + service role が RLS バイパス)。

-- ============================================================
-- 1. mini_inquiries (ミニ記事依頼)
-- ============================================================
CREATE TABLE mini_inquiries (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- フォーム入力内容
  sns_urls             text[] NOT NULL DEFAULT '{}',  -- 最大 5 つ
  inquiry_type         text NOT NULL
    CHECK (inquiry_type IN ('event', 'shop', 'group', 'other')),
  inquiry_type_other   text,                          -- type='other' のとき補足
  phone                text NOT NULL,
  email                text,
  publish_preference   text NOT NULL
    CHECK (publish_preference IN ('anytime', 'by_date', 'in_month')),
  publish_target_date  date,                          -- by_date のとき
  publish_target_month text,                          -- in_month のとき "2026-06"
  image_urls           text[] NOT NULL DEFAULT '{}',  -- inquiry-images の URL (最大 2)
  consent              boolean NOT NULL DEFAULT false,

  -- 運用ステータス
  status               text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'generating', 'published', 'skipped')),
  admin_notes          text,
  generated_post_id    uuid REFERENCES posts(id) ON DELETE SET NULL,

  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mini_inquiries_status     ON mini_inquiries(status);
CREATE INDEX idx_mini_inquiries_created_at ON mini_inquiries(created_at DESC);

ALTER TABLE mini_inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage mini_inquiries" ON mini_inquiries;
CREATE POLICY "Authenticated users can manage mini_inquiries" ON mini_inquiries
  FOR ALL USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');

DROP TRIGGER IF EXISTS trg_mini_inquiries_updated_at ON mini_inquiries;
CREATE TRIGGER trg_mini_inquiries_updated_at
  BEFORE UPDATE ON mini_inquiries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. long_inquiries (ロング記事依頼 / 取材依頼)
-- ============================================================
CREATE TABLE long_inquiries (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 種別と名称 (種別で必須項目が変わる)
  client_type          text NOT NULL
    CHECK (client_type IN ('individual', 'organization', 'group')),
  individual_name      text,                          -- individual のとき必須
  organization_name    text,                          -- organization のとき必須 (貴社名)
  department_name      text,                          -- organization のとき任意 (部署名)
  group_name           text,                          -- group のとき必須
  contact_person       text NOT NULL,                 -- 担当者名 (全種別必須)

  -- 取材内容
  address              text NOT NULL,
  interview_content    text NOT NULL,
  publish_preference   text,                          -- 公開希望時期 (フリー)
  interview_preference text,                          -- 取材希望時期 (フリー)

  -- 連絡先
  phone                text NOT NULL,
  email                text,
  consent              boolean NOT NULL DEFAULT false,

  -- 案件管理ステータス
  status               text NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',        -- 受付
      'contacted',      -- 連絡済
      'scheduled',      -- 取材日確定
      'interviewed',    -- 取材実施
      'writing',        -- 執筆中
      'published',      -- 公開済み
      'cancelled'       -- キャンセル
    )),
  admin_notes          text,
  generated_post_id    uuid REFERENCES posts(id) ON DELETE SET NULL,
  scheduled_at         timestamptz,                   -- 取材日 (確定時)
  fee_amount           integer,                       -- 確定金額 (円)

  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_long_inquiries_status       ON long_inquiries(status);
CREATE INDEX idx_long_inquiries_scheduled_at ON long_inquiries(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX idx_long_inquiries_created_at   ON long_inquiries(created_at DESC);

ALTER TABLE long_inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage long_inquiries" ON long_inquiries;
CREATE POLICY "Authenticated users can manage long_inquiries" ON long_inquiries
  FOR ALL USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');

DROP TRIGGER IF EXISTS trg_long_inquiries_updated_at ON long_inquiries;
CREATE TRIGGER trg_long_inquiries_updated_at
  BEFORE UPDATE ON long_inquiries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 3. inquiry-images Storage バケット (フォーム添付画像)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('inquiry-images', 'inquiry-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read access for inquiry-images" ON storage.objects;
CREATE POLICY "Public read access for inquiry-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'inquiry-images');

DROP POLICY IF EXISTS "Authenticated uploads to inquiry-images" ON storage.objects;
CREATE POLICY "Authenticated uploads to inquiry-images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'inquiry-images' AND (select auth.role()) = 'authenticated'
  );

DROP POLICY IF EXISTS "Authenticated updates to inquiry-images" ON storage.objects;
CREATE POLICY "Authenticated updates to inquiry-images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'inquiry-images' AND (select auth.role()) = 'authenticated'
  );

DROP POLICY IF EXISTS "Authenticated deletes from inquiry-images" ON storage.objects;
CREATE POLICY "Authenticated deletes from inquiry-images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'inquiry-images' AND (select auth.role()) = 'authenticated'
  );

-- ============================================================
-- 4. 既存 IG 取り込みデータ・テーブルの削除 (全てテストデータ)
-- ============================================================

-- 4a. ig-imported バケットを参照する下書きテスト記事 2 件を削除
--     (post_categories / post_hashtags は ON DELETE CASCADE で自動削除)
DELETE FROM posts WHERE id IN (
  '7a008cf2-a372-41d2-8c85-62300c290033',  -- 12/8 資金調達スキルアップ講座 (draft)
  '16dad9a4-4e2f-4c95-85e5-6d97cbf29b49'   -- 11/20 ホームページ開設講座 (draft)
);

-- 4b. ig-imported バケットの policy を削除
--     (バケット本体とオブジェクトは Storage API で削除済み。
--      storage.objects/buckets への直接 DELETE は protect_delete トリガーで禁止されているため)
DROP POLICY IF EXISTS "Public read access for ig-imported"       ON storage.objects;
DROP POLICY IF EXISTS "Authenticated uploads to ig-imported"     ON storage.objects;
DROP POLICY IF EXISTS "Authenticated updates to ig-imported"     ON storage.objects;
DROP POLICY IF EXISTS "Authenticated deletes from ig-imported"   ON storage.objects;

-- 4c. テーブル DROP (ig_imported_posts → ig_sources の順、FK 依存のため)
DROP TABLE IF EXISTS ig_imported_posts;
DROP TABLE IF EXISTS ig_sources;
