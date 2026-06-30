-- 画像ギャラリーの並び順を「記事の新着日付順」から「ランダム（シード付き）」に変更。
--
-- 素の random() は LIMIT/OFFSET ページングで毎回並び直り、画像の重複・欠落が起きるため、
-- リクエスト単位のシード文字列 p_seed を受け取り、md5(画像id || seed) の決定的な擬似ランダム順で並べる。
-- 同一シード内では順序が安定するので「もっと見る」のページングが壊れない。
-- リクエストごとに新しいシードを渡せば訪問のたびに並びが変わる。
-- ピン留め (is_featured) は引き続き先頭に出す。
--
-- p_seed に DEFAULT '' を付けるため、旧 2 引数シグネチャを一旦 DROP してから作り直す
-- (CREATE OR REPLACE では引数追加ができないため)。DEFAULT のおかげで 2 引数呼び出しも
-- 引き続き解決でき後方互換 (seed 未指定なら固定のシャッフル順)。

DROP FUNCTION IF EXISTS get_gallery_images(integer, integer);

CREATE OR REPLACE FUNCTION get_gallery_images(
  p_limit integer,
  p_offset integer,
  p_seed text DEFAULT ''
)
RETURNS TABLE (
  image_url text,
  caption text,
  alt text,
  is_featured boolean,
  post_published_at timestamptz,
  slug text,
  category_slug text,
  title text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pi.image_url,
    pi.caption,
    pi.alt,
    pi.is_featured,
    pi.post_published_at,
    p.slug,
    cat.category_slug,
    p.title
  FROM post_images pi
  JOIN posts p ON p.id = pi.post_id
  LEFT JOIN LATERAL (
    SELECT c.slug AS category_slug
    FROM post_categories pc
    JOIN categories c ON c.id = pc.category_id
    WHERE pc.post_id = p.id
    ORDER BY c.order_num ASC NULLS LAST
    LIMIT 1
  ) cat ON true
  WHERE pi.post_is_published = true
    AND pi.is_visible = true
  -- ピン留め → シード付きランダム (md5 ハッシュ) → id (タイブレーク)
  ORDER BY pi.is_featured DESC, md5(pi.id::text || p_seed), pi.id
  LIMIT p_limit OFFSET p_offset;
$$;
