-- 記事が読まれるたびに updated_at (= 公開ページの「更新日」/ dateModified / サイトマップの lastmod)
-- が今の時刻になっていた。increment_post_view_count が posts を UPDATE し、共通トリガー
-- update_updated_at_column がそれを「更新」とみなしていたため。
-- posts 専用の関数にして、中身が変わっていない UPDATE (閲覧数・★・検索用の生成列だけ) では
-- updated_at を据え置く。他テーブルは従来の update_updated_at_column のまま。
CREATE OR REPLACE FUNCTION public.update_posts_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
  IF (to_jsonb(NEW) - ARRAY['view_count', 'is_featured', 'updated_at', 'search_body'])
     IS NOT DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['view_count', 'is_featured', 'updated_at', 'search_body']) THEN
    NEW.updated_at = OLD.updated_at;
  ELSE
    NEW.updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_posts_updated_at ON public.posts;
CREATE TRIGGER trigger_update_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_posts_updated_at();

-- 既存の updated_at は「最後に読まれた日」になっていて本当の編集日は残っていないので、
-- 全記事を公開日 (無ければ作成日) に戻す (2026-11-07 決定)。控えは
-- supabase/backups/20261107_posts_updated_at_backup.md。
-- 新しいトリガーは updated_at だけの UPDATE を無視するので、この間だけ止める。
ALTER TABLE public.posts DISABLE TRIGGER trigger_update_posts_updated_at;
UPDATE public.posts SET updated_at = COALESCE(published_at, created_at);
ALTER TABLE public.posts ENABLE TRIGGER trigger_update_posts_updated_at;
