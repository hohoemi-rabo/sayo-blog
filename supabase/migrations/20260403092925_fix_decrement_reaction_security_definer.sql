-- Fix decrement_reaction_count: add SECURITY DEFINER so it can bypass RLS
CREATE OR REPLACE FUNCTION public.decrement_reaction_count(p_post_id uuid, p_reaction_type text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE reactions
  SET count = GREATEST(count - 1, 0),
      updated_at = NOW()
  WHERE post_id = p_post_id AND reaction_type = p_reaction_type
  RETURNING count INTO new_count;

  RETURN COALESCE(new_count, 0);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.decrement_reaction_count(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.decrement_reaction_count(uuid, text) TO authenticated;
