-- 取材記事 LP (/request/long) 化に伴い、希望プランをフォームで受け取れるようにする。
--
-- LP で 3 プランを明示 (初期モニター ¥500 / 取材記事 ¥10,000 / 深掘り ¥30,000) したため、
-- 依頼時点でどれを希望しているか (または未定か) を控える。
-- 管理側の `fee_amount` は紗代さんが後から確定させる実際の金額で、役割が違う。
--
-- テーブルは 0 行のため DEFAULT 付き NOT NULL で無損失に追加できる。

alter table public.long_inquiries
  add column if not exists desired_plan text not null default 'undecided';

alter table public.long_inquiries
  drop constraint if exists long_inquiries_desired_plan_check;

alter table public.long_inquiries
  add constraint long_inquiries_desired_plan_check
  check (desired_plan in ('monitor', 'standard', 'deep', 'undecided'));

comment on column public.long_inquiries.desired_plan is
  '依頼者が希望するプラン: monitor=初期モニター500円 / standard=取材記事1万円 / deep=深掘り3万円 / undecided=未定';
