-- Create RPC function to increment view count
CREATE OR REPLACE FUNCTION increment_post_view_count(post_slug TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  -- Increment view_count and return new value
  UPDATE posts
  SET view_count = view_count + 1
  WHERE slug = post_slug AND is_published = true
  RETURNING view_count INTO new_count;

  RETURN new_count;
END;
$$;

-- Grant execute permission to anonymous users (public access)
GRANT EXECUTE ON FUNCTION increment_post_view_count(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION increment_post_view_count(TEXT) TO authenticated;
