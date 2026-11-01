-- 旧サイト内検索の後片付け (2026-11-01)
-- 新しい検索 search_published_posts (migration 20261101120000) のデプロイ後に適用。
-- アプリからの参照が無いことを確認済み (src / scripts を grep)。

DROP FUNCTION IF EXISTS public.search_posts(text, integer, integer);
DROP FUNCTION IF EXISTS public.search_suggestions(text);

-- to_tsvector('simple') の列と索引 (日本語では文が丸ごと 1 語になり役に立っていなかった)
DROP INDEX IF EXISTS public.idx_posts_search_vector;
ALTER TABLE public.posts DROP COLUMN IF EXISTS search_vector;

-- 旧検索の trigram 類似度用。新検索は strpos で全件走査 (記事 ~100 件) なので使わない
DROP INDEX IF EXISTS public.idx_posts_title_trgm;
DROP INDEX IF EXISTS public.idx_posts_excerpt_trgm;
