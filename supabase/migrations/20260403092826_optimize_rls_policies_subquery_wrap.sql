-- Optimize RLS policies: wrap auth.role() in SELECT subquery
-- to prevent per-row re-evaluation (5-10x performance improvement)

-- posts
DROP POLICY IF EXISTS "Authenticated users can do everything with posts" ON posts;
CREATE POLICY "Authenticated users can do everything with posts" ON posts
  FOR ALL USING ((select auth.role()) = 'authenticated');

-- categories
DROP POLICY IF EXISTS "Authenticated users can do everything with categories" ON categories;
CREATE POLICY "Authenticated users can do everything with categories" ON categories
  FOR ALL USING ((select auth.role()) = 'authenticated');

-- hashtags
DROP POLICY IF EXISTS "Authenticated users can do everything with hashtags" ON hashtags;
CREATE POLICY "Authenticated users can do everything with hashtags" ON hashtags
  FOR ALL USING ((select auth.role()) = 'authenticated');

-- post_categories
DROP POLICY IF EXISTS "Authenticated users can do everything with post_categories" ON post_categories;
CREATE POLICY "Authenticated users can do everything with post_categories" ON post_categories
  FOR ALL USING ((select auth.role()) = 'authenticated');

-- post_hashtags
DROP POLICY IF EXISTS "Authenticated users can do everything with post_hashtags" ON post_hashtags;
CREATE POLICY "Authenticated users can do everything with post_hashtags" ON post_hashtags
  FOR ALL USING ((select auth.role()) = 'authenticated');

-- ai_prompt_tags
DROP POLICY IF EXISTS "Authenticated users can manage tags" ON ai_prompt_tags;
CREATE POLICY "Authenticated users can manage tags" ON ai_prompt_tags
  FOR ALL USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');

-- ai_usage_limits
DROP POLICY IF EXISTS "Authenticated users can manage usage limits" ON ai_usage_limits;
CREATE POLICY "Authenticated users can manage usage limits" ON ai_usage_limits
  FOR ALL USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');

-- ai_usage_logs
DROP POLICY IF EXISTS "Authenticated users can view usage logs" ON ai_usage_logs;
CREATE POLICY "Authenticated users can view usage logs" ON ai_usage_logs
  FOR SELECT USING ((select auth.role()) = 'authenticated');

-- article_knowledge
DROP POLICY IF EXISTS "Authenticated users can manage knowledge" ON article_knowledge;
CREATE POLICY "Authenticated users can manage knowledge" ON article_knowledge
  FOR ALL USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');
