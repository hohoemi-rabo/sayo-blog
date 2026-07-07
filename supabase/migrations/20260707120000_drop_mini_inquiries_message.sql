-- ミニ記事フォームの「伝えたいこと」自由記述欄を廃止 (2026-07-07)
--
-- 方針変更: ターゲットは「SNS に投稿している人」= 紹介したい SNS 投稿の URL を送る人。
-- 自由記述欄 (message) を削除し、SNS URL を必須 (最低 1 件) に戻した。
-- mini_inquiries テーブルは本番でまだ 0 行のため実データの損失はない。
-- 将来また自由記述が必要になった場合は nullable カラムの再追加 (非破壊) で戻せる。
--
-- 追加元: 20260706120000_add_mini_inquiries_message.sql

alter table public.mini_inquiries drop column if exists message;
