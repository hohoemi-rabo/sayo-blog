-- カテゴリ再編 (HOISA カテゴリ再編・newkategori.xlsx の「新カテゴリ（仮）」を適用)
--
-- 旧 5 カテゴリ → 新 6 カテゴリ。公開前のため URL スラッグも意味に合わせて全面的に付け替える。
--   gourmet (グルメ・ランチ)  → food    (食・グルメ)
--   event   (イベント情報)    → event   (イベント・講座)
--   spot    (観光・遊び場)    → outing  (おでかけ)
--   culture (文化・歴史・人)  → culture (文化・歴史)
--   news    (地域ニュース)    → life    (暮らし)   ※ news は全記事を他へ振り分け可能だったため廃止し、行を暮らしに転用
--   (新設)                    → people  (人・活動) ※ 今後の地域の人・団体・市民活動の受け皿
--
-- 既存行は UPDATE で転用する (id を保つ = post_categories の FK を張り直さずに済む)。
-- 記事の振り分けは post slug → 新カテゴリ slug の対応表で行う (全 96 記事。旧カテゴリの後継以外へ移るのは 26 記事。スラッグ変更により URL は gourmet/spot/news の記事で変わる)。
-- 旧 URL (/gourmet/xxx 等) は記事ページ側でカテゴリ不一致を検出して正規 URL へ 301 する。
-- 適用前の割り当ては supabase/backups/20261014_category_reorg_backup.md に控えてある。

BEGIN;

UPDATE categories SET slug = 'food',    name = '食・グルメ',     order_num = 1,
  description = '飯田・南信州の飲食店、テイクアウト、地域の食品やお土産の情報', updated_at = now()
  WHERE slug = 'gourmet';
UPDATE categories SET                   name = 'イベント・講座', order_num = 2,
  description = '飯田市周辺のイベント、祭り、展示、講座・ワークショップの開催情報', updated_at = now()
  WHERE slug = 'event';
UPDATE categories SET slug = 'outing',  name = 'おでかけ',       order_num = 3,
  description = '公園や観光スポット、体験・レジャーなど、出かけたくなる場所の紹介', updated_at = now()
  WHERE slug = 'spot';
UPDATE categories SET                   name = '文化・歴史',     order_num = 4,
  description = '伝統工芸、歴史、文化財、地域ゆかりの人や作品など、地域の文化の紹介', updated_at = now()
  WHERE slug = 'culture';
UPDATE categories SET slug = 'life',    name = '暮らし',         order_num = 5,
  description = '開店・閉店や暮らしのサービスなど、地域の生活に役立つ情報', updated_at = now()
  WHERE slug = 'news';

INSERT INTO categories (slug, name, order_num, description)
VALUES ('people', '人・活動', 6, '地域で活動する人・団体・市民活動の紹介');

-- 記事ごとの付け替え (1 記事 1 カテゴリ)。検証でも使うので一時テーブルに置く
CREATE TEMP TABLE category_reorg_mapping (post_slug text PRIMARY KEY, category_slug text NOT NULL) ON COMMIT DROP;
INSERT INTO category_reorg_mapping (post_slug, category_slug) VALUES
  ('azima-kasa', 'culture'),
  ('important-cultural-property', 'culture'),
  ('kako-satoshi-library', 'culture'),
  ('kikusui-shin-brand', 'culture'),
  ('kunio-yanagita-museum', 'culture'),
  ('sanaa-architecture', 'culture'),
  ('toyama-history-museum', 'culture'),
  ('aloha-fes', 'event'),
  ('apita-tuna-show', 'event'),
  ('business-support-seminar', 'event'),
  ('dementia-yose', 'event'),
  ('hogoken-movie', 'event'),
  ('hotaru-festival', 'event'),
  ('iida-events-summary', 'event'),
  ('ikebana-exhibition', 'event'),
  ('kazakoshi-flower-exhibition', 'event'),
  ('kikusui-stamp-rally', 'event'),
  ('minamishinshu-kekkakuhen', 'event'),
  ('namiki-market', 'event'),
  ('ningyogeki-festival', 'event'),
  ('okanoue-snack', 'event'),
  ('omigi-workshop', 'event'),
  ('pet-event', 'event'),
  ('puppet-show-festival', 'event'),
  ('stone-sculpture-exhibition', 'event'),
  ('tenryukyo-odori', 'event'),
  ('yakushi-neko-ennichi', 'event'),
  ('yakushi-neko-go', 'event'),
  ('yakushi-neko-protect', 'event'),
  ('yaskushi-neko-information', 'event'),
  ('yui-square-christmas', 'event'),
  ('yui-square-halloween', 'event'),
  ('4rest-okonomiyaki-harutama', 'food'),
  ('asahimatsu-factory-shop', 'food'),
  ('beniya-cake-shop', 'food'),
  ('cafe-sanzenkura', 'food'),
  ('calf-crepe-cafe', 'food'),
  ('choco-mint-crepe', 'food'),
  ('coffee-fu', 'food'),
  ('eazy-diner', 'food'),
  ('food-truck-info', 'food'),
  ('hirugami-coffee', 'food'),
  ('inachiku-menma', 'food'),
  ('jersey-milk-cafe', 'food'),
  ('kashiwa-mochi', 'food'),
  ('kikusui-hiyaoroshi', 'food'),
  ('lit-bakery-cafe', 'food'),
  ('mcdonalds-new-store', 'food'),
  ('mikawaya-history', 'food'),
  ('niku-suzukiya', 'food'),
  ('niwanowa-cafe', 'food'),
  ('oidenansho-sauce', 'food'),
  ('omigi-baked-sweets', 'food'),
  ('oreha-chef-bento', 'food'),
  ('pan-no-jikan', 'food'),
  ('polka-cake', 'food'),
  ('ramen-takahashi', 'food'),
  ('sagami-open', 'food'),
  ('starbucks-opening', 'food'),
  ('strawberry-ice', 'food'),
  ('tanabata-wagashi', 'food'),
  ('tesshin-bento', 'food'),
  ('tomato-vending', 'food'),
  ('toyama-bakery', 'food'),
  ('toyama-mochi-manju', 'food'),
  ('yoshi-imo-shop', 'food'),
  ('zenganji-gold-soft', 'food'),
  ('apita-renewal', 'life'),
  ('color-diagnosis-salon', 'life'),
  ('footcare-hiname', 'life'),
  ('kids-cafe-open', 'life'),
  ('kids-playground-renewal', 'life'),
  ('kurumaya-close', 'life'),
  ('miyauchi-randoseru', 'life'),
  ('nakata-cafe-open', 'life'),
  ('nitori-close', 'life'),
  ('pilates-boom-private-studio', 'life'),
  ('aokuzure-tunnel', 'outing'),
  ('apple-footbath', 'outing'),
  ('haba-park', 'outing'),
  ('iida-art-museum', 'outing'),
  ('iida-city-pool', 'outing'),
  ('nanakuri-komainu', 'outing'),
  ('nashikko-park', 'outing'),
  ('neuk-sauna', 'outing'),
  ('old-kizawa-school', 'outing'),
  ('putty-bus', 'outing'),
  ('suzuoka-castle-appeal', 'outing'),
  ('suzuoka-castle-park', 'outing'),
  ('tenryukyo-dragon', 'outing'),
  ('toyooka-cherry', 'outing'),
  ('yamairo-guesthouse', 'outing'),
  ('yamamoto-park', 'outing'),
  ('yui-square-diorama', 'outing'),
  ('zenganji-kaidan', 'outing'),
  ('toyooka-happy-days-matsuo', 'people');

UPDATE post_categories pc
SET category_id = c.id
FROM category_reorg_mapping m
JOIN posts p ON p.slug = m.post_slug
JOIN categories c ON c.slug = m.category_slug
WHERE pc.post_id = p.id;

-- 全記事が対応表どおりに振り分けられたことを検証 (1 件でも違えば例外 = 全体をロールバック)
DO $$
DECLARE
  total int;
  mismatched int;
  missing int;
BEGIN
  SELECT count(*) INTO total FROM post_categories;
  -- 対応表と違うカテゴリに付いている記事 / 対応表に無い記事
  SELECT count(*) INTO mismatched
  FROM post_categories pc
  JOIN posts p ON p.id = pc.post_id
  JOIN categories c ON c.id = pc.category_id
  LEFT JOIN category_reorg_mapping m ON m.post_slug = p.slug
  WHERE m.category_slug IS DISTINCT FROM c.slug;
  -- 対応表にあるのに DB に存在しない記事 (slug の打ち間違い等)
  SELECT count(*) INTO missing
  FROM category_reorg_mapping m
  WHERE NOT EXISTS (SELECT 1 FROM posts p WHERE p.slug = m.post_slug);
  IF total <> 96 OR mismatched > 0 OR missing > 0 THEN
    RAISE EXCEPTION 'category reorg check failed: total=%, mismatched=%, missing=%', total, mismatched, missing;
  END IF;
END $$;

COMMIT;
