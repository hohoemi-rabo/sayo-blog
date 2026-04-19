-- Phase 3: Storage buckets for Instagram integration
-- ig-posts:    Blog -> IG direction (IG post images)
-- ig-imported: IG -> Blog direction (images imported from IG posts)

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('ig-posts',    'ig-posts',    true),
  ('ig-imported', 'ig-imported', true)
ON CONFLICT (id) DO NOTHING;

-- ig-posts policies
DROP POLICY IF EXISTS "Public read access for ig-posts" ON storage.objects;
CREATE POLICY "Public read access for ig-posts" ON storage.objects
  FOR SELECT USING (bucket_id = 'ig-posts');

DROP POLICY IF EXISTS "Authenticated uploads to ig-posts" ON storage.objects;
CREATE POLICY "Authenticated uploads to ig-posts" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'ig-posts' AND (select auth.role()) = 'authenticated'
  );

DROP POLICY IF EXISTS "Authenticated updates to ig-posts" ON storage.objects;
CREATE POLICY "Authenticated updates to ig-posts" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'ig-posts' AND (select auth.role()) = 'authenticated'
  );

DROP POLICY IF EXISTS "Authenticated deletes from ig-posts" ON storage.objects;
CREATE POLICY "Authenticated deletes from ig-posts" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'ig-posts' AND (select auth.role()) = 'authenticated'
  );

-- ig-imported policies
DROP POLICY IF EXISTS "Public read access for ig-imported" ON storage.objects;
CREATE POLICY "Public read access for ig-imported" ON storage.objects
  FOR SELECT USING (bucket_id = 'ig-imported');

DROP POLICY IF EXISTS "Authenticated uploads to ig-imported" ON storage.objects;
CREATE POLICY "Authenticated uploads to ig-imported" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'ig-imported' AND (select auth.role()) = 'authenticated'
  );

DROP POLICY IF EXISTS "Authenticated updates to ig-imported" ON storage.objects;
CREATE POLICY "Authenticated updates to ig-imported" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'ig-imported' AND (select auth.role()) = 'authenticated'
  );

DROP POLICY IF EXISTS "Authenticated deletes from ig-imported" ON storage.objects;
CREATE POLICY "Authenticated deletes from ig-imported" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'ig-imported' AND (select auth.role()) = 'authenticated'
  );
