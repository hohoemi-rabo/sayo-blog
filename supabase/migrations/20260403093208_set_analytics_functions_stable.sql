-- Mark read-only analytics functions as STABLE
-- (they only read data — allows query planner optimization)

CREATE OR REPLACE FUNCTION public.get_today_usage_stats()
 RETURNS TABLE(total_queries bigint, token_input bigint, token_output bigint, unique_sessions bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint AS total_queries,
    COALESCE(SUM(l.token_input), 0)::bigint AS token_input,
    COALESCE(SUM(l.token_output), 0)::bigint AS token_output,
    COUNT(DISTINCT l.session_id)::bigint AS unique_sessions
  FROM ai_usage_logs l
  WHERE l.created_at >= (now() AT TIME ZONE 'Asia/Tokyo')::date AT TIME ZONE 'Asia/Tokyo';
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_monthly_usage_stats()
 RETURNS TABLE(total_queries bigint, token_input bigint, token_output bigint, unique_sessions bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint AS total_queries,
    COALESCE(SUM(l.token_input), 0)::bigint AS token_input,
    COALESCE(SUM(l.token_output), 0)::bigint AS token_output,
    COUNT(DISTINCT l.session_id)::bigint AS unique_sessions
  FROM ai_usage_logs l
  WHERE l.created_at >= date_trunc('month', now() AT TIME ZONE 'Asia/Tokyo') AT TIME ZONE 'Asia/Tokyo';
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_daily_usage_breakdown()
 RETURNS TABLE(date text, queries bigint, tokens bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    to_char((l.created_at AT TIME ZONE 'Asia/Tokyo')::date, 'YYYY-MM-DD') AS date,
    COUNT(*)::bigint AS queries,
    (COALESCE(SUM(l.token_input), 0) + COALESCE(SUM(l.token_output), 0))::bigint AS tokens
  FROM ai_usage_logs l
  WHERE l.created_at >= date_trunc('month', now() AT TIME ZONE 'Asia/Tokyo') AT TIME ZONE 'Asia/Tokyo'
  GROUP BY (l.created_at AT TIME ZONE 'Asia/Tokyo')::date
  ORDER BY (l.created_at AT TIME ZONE 'Asia/Tokyo')::date;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_top_queries(p_limit integer DEFAULT 10)
 RETURNS TABLE(query text, count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    l.query,
    COUNT(*)::bigint AS count
  FROM ai_usage_logs l
  WHERE l.created_at >= date_trunc('month', now() AT TIME ZONE 'Asia/Tokyo') AT TIME ZONE 'Asia/Tokyo'
  GROUP BY l.query
  ORDER BY count DESC
  LIMIT p_limit;
END;
$function$;
