-- サイト内検索の作り直し (2026-11-01)
--
-- 旧 search_posts は to_tsvector('simple') (スペース区切り前提 = 日本語の文が丸ごと 1 語になる) と
-- タイトル・抜粋の trigram 類似度だけで探していたため、「下伊那」「子ども」「天竜峡」が 0 件、
-- 「飯田」が 7 件 (含む記事は 97 件) という状態だった。
--
-- 新しい検索は「その言葉を含むか」で判定する (記事は 100 件程度なので全件走査で十分速い):
--   * 対象: タイトル / タグ名 / カテゴリ名・slug / 抜粋 / 本文 (HTML を除いた文字)
--   * 複数語 (スペース区切り) はすべてを含む記事だけ (AND)
--   * 全角・半角と大文字・小文字をそろえる (NFKC + lower)。語の分割と正規化は TS 側
--     (src/lib/search-text.ts) と同じ規則で、ここでも念のため正規化する
--   * 並び: タイトル 10 > タグ 6 > カテゴリ 4 > 抜粋 3 > 本文 1 (+ 出現回数で最大 +2) の合計 → 新しい順
--
-- 旧 search_posts / search_suggestions / search_vector は、新しいコードのデプロイ後に
-- 別の migration で消す (先に消すとデプロイまでの間、本番の検索が壊れるため)。

-- 本文から HTML タグと主な文字参照を除き、検索用に正規化した文字列
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS search_body text
  GENERATED ALWAYS AS (
    lower(normalize(
      regexp_replace(
        regexp_replace(coalesce(content, ''), '<[^>]*>', ' ', 'g'),
        '&(nbsp|amp|lt|gt|quot|#39|#x27);', ' ', 'g'
      ),
      NFKC
    ))
  ) STORED;

CREATE OR REPLACE FUNCTION public.search_published_posts(
  search_terms text[],
  result_limit integer DEFAULT 12,
  result_offset integer DEFAULT 0
)
RETURNS TABLE (id uuid, score real, total_count bigint)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  WITH terms AS (
    SELECT DISTINCT lower(normalize(btrim(t), NFKC)) AS term
    FROM unnest(search_terms[1:5]) AS t
    WHERE btrim(t) <> ''
  ),
  docs AS (
    SELECT
      p.id,
      p.published_at,
      lower(normalize(coalesce(p.title, ''), NFKC)) AS title,
      lower(normalize(coalesce(p.excerpt, ''), NFKC)) AS excerpt,
      p.search_body AS body,
      coalesce((
        SELECT lower(normalize(string_agg(h.name, ' '), NFKC))
        FROM post_hashtags ph JOIN hashtags h ON h.id = ph.hashtag_id
        WHERE ph.post_id = p.id
      ), '') AS tags,
      coalesce((
        SELECT lower(normalize(string_agg(c.name || ' ' || c.slug, ' '), NFKC))
        FROM post_categories pc JOIN categories c ON c.id = pc.category_id
        WHERE pc.post_id = p.id
      ), '') AS cats
    FROM posts p
    WHERE p.is_published = true
  ),
  per_term AS (
    SELECT
      d.id,
      d.published_at,
      (CASE WHEN strpos(d.title, t.term) > 0 THEN 10 ELSE 0 END
       + CASE WHEN strpos(d.tags, t.term) > 0 THEN 6 ELSE 0 END
       + CASE WHEN strpos(d.cats, t.term) > 0 THEN 4 ELSE 0 END
       + CASE WHEN strpos(d.excerpt, t.term) > 0 THEN 3 ELSE 0 END
       + CASE WHEN strpos(d.body, t.term) > 0
           -- 本文に何度も出てくる記事を少しだけ上に (最大 +2)
           THEN 1 + least(
             (length(d.body) - length(replace(d.body, t.term, ''))) / length(t.term),
             10
           ) * 0.2
           ELSE 0 END
      )::real AS term_score
    FROM docs d CROSS JOIN terms t
  ),
  matched AS (
    SELECT pt.id, pt.published_at, sum(pt.term_score)::real AS score
    FROM per_term pt
    GROUP BY pt.id, pt.published_at
    -- すべての語を含む記事だけ
    HAVING bool_and(pt.term_score > 0)
  )
  SELECT m.id, m.score, count(*) OVER () AS total_count
  FROM matched m
  ORDER BY m.score DESC, m.published_at DESC NULLS LAST, m.id
  LIMIT greatest(result_limit, 0)
  OFFSET greatest(result_offset, 0);
$$;

GRANT EXECUTE ON FUNCTION public.search_published_posts(text[], integer, integer) TO anon, authenticated;
