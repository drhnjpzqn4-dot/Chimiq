-- RPC:er för api-server som tidigare förlit sig på Drizzle/pg mot pooler.
-- Kör via befintlig migrate-kedja (lib/db/migrations).

-- ---------------------------------------------------------------------------
-- Daily scan counts (atomärt; motsvarar Drizzle ON CONFLICT … WHERE)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_daily_scan_slot(
  p_user_id text,
  p_limit int
)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  d date := (timezone('utc', now()))::date;
  v int;
BEGIN
  INSERT INTO public.daily_scan_counts (user_id, scan_date, count)
  VALUES (p_user_id, d, 1)
  ON CONFLICT (user_id, scan_date) DO UPDATE
    SET count = public.daily_scan_counts.count + 1,
        updated_at = now()
    WHERE public.daily_scan_counts.count < p_limit
  RETURNING public.daily_scan_counts.count INTO v;
  RETURN v;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_daily_scan_count(p_user_id text)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  d date := (timezone('utc', now()))::date;
  v int;
BEGIN
  INSERT INTO public.daily_scan_counts (user_id, scan_date, count)
  VALUES (p_user_id, d, 1)
  ON CONFLICT (user_id, scan_date) DO UPDATE
    SET count = public.daily_scan_counts.count + 1,
        updated_at = now()
  RETURNING public.daily_scan_counts.count INTO v;
  RETURN v;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_daily_scan_slot(p_user_id text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  d date := (timezone('utc', now()))::date;
BEGIN
  UPDATE public.daily_scan_counts
  SET count = GREATEST(count - 1, 0),
      updated_at = now()
  WHERE user_id = p_user_id AND scan_date = d;
END;
$$;

-- ---------------------------------------------------------------------------
-- Tips: rate limit + insert i samma transaktion (pg_advisory_xact_lock)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_tip_with_rate_limit(
  p_author_id text,
  p_body text,
  p_limit int,
  p_window_ms bigint
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_since timestamptz := now() - (p_window_ms * interval '1 millisecond');
  v_recent int;
  v_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('tips_rl:' || p_author_id, 0));
  SELECT count(*)::int INTO v_recent
  FROM public.tips
  WHERE author_id = p_author_id AND created_at >= v_since;
  IF v_recent >= p_limit THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'rate_limited',
      'recent', v_recent
    );
  END IF;
  INSERT INTO public.tips (author_id, body)
  VALUES (p_author_id, p_body)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('ok', true, 'id', v_id::text);
END;
$$;

-- ---------------------------------------------------------------------------
-- Admin funnel: aggregeringar som PostgREST inte uttrycker enkelt
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_funnel_counts(p_since timestamptz)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'signups',
      (SELECT count(*)::int FROM public.users u
       WHERE p_since IS NULL OR u.created_at >= p_since),
    'scans',
      (SELECT count(*)::int FROM (
         SELECT DISTINCT se.user_id
         FROM public.scan_events se
         WHERE se.user_id IS NOT NULL
           AND (p_since IS NULL OR se.created_at >= p_since)
       ) s),
    'shelfSaves',
      (SELECT count(*)::int FROM (
         SELECT DISTINCT sp.user_id
         FROM public.shelf_products sp
         WHERE p_since IS NULL OR sp.added_at >= p_since
       ) x),
    'checkouts',
      (SELECT count(*)::int FROM (
         SELECT DISTINCT ce.user_id
         FROM public.checkout_events ce
         WHERE p_since IS NULL OR ce.created_at >= p_since
       ) x),
    'checkoutAbandoned',
      (SELECT count(*)::int FROM (
         SELECT DISTINCT cae.user_id
         FROM public.checkout_abandonment_events cae
         WHERE p_since IS NULL OR cae.created_at >= p_since
       ) x),
    'recoveryClicks',
      (SELECT count(*)::int FROM (
         SELECT DISTINCT cre.user_id
         FROM public.checkout_recovery_events cre
         WHERE cre.action = 'click'
           AND (p_since IS NULL OR cre.created_at >= p_since)
       ) x),
    'recoveryDismissals',
      (SELECT count(*)::int FROM (
         SELECT DISTINCT cre.user_id
         FROM public.checkout_recovery_events cre
         WHERE cre.action = 'dismissed'
           AND (p_since IS NULL OR cre.created_at >= p_since)
       ) x),
    'subscriptions',
      (SELECT count(*)::int FROM (
         SELECT DISTINCT sev.user_id
         FROM public.subscription_events sev
         WHERE sev.status IN ('active', 'trialing')
           AND (p_since IS NULL OR sev.created_at >= p_since)
       ) x)
  );
$$;

CREATE OR REPLACE FUNCTION public.admin_funnel_series(
  p_since timestamptz,
  p_granularity text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  g text := CASE WHEN lower(p_granularity) = 'week' THEN 'week' ELSE 'day' END;
  signups jsonb;
  scans jsonb;
  shelf jsonb;
  chk jsonb;
  aband jsonb;
  rclk jsonb;
  rdis jsonb;
  subs jsonb;
BEGIN
  SELECT coalesce(jsonb_agg(jsonb_build_object('date', bucket, 'count', cnt) ORDER BY bucket), '[]'::jsonb)
  INTO signups
  FROM (
    SELECT to_char(date_trunc(g, u.created_at), 'YYYY-MM-DD') AS bucket,
           count(*)::bigint AS cnt
    FROM public.users u
    WHERE p_since IS NULL OR u.created_at >= p_since
    GROUP BY 1
  ) q;

  SELECT coalesce(jsonb_agg(jsonb_build_object('date', bucket, 'count', cnt) ORDER BY bucket), '[]'::jsonb)
  INTO scans
  FROM (
    SELECT to_char(date_trunc(g, se.created_at), 'YYYY-MM-DD') AS bucket,
           count(DISTINCT se.user_id)::bigint AS cnt
    FROM public.scan_events se
    WHERE se.user_id IS NOT NULL
      AND (p_since IS NULL OR se.created_at >= p_since)
    GROUP BY 1
  ) q;

  SELECT coalesce(jsonb_agg(jsonb_build_object('date', bucket, 'count', cnt) ORDER BY bucket), '[]'::jsonb)
  INTO shelf
  FROM (
    SELECT to_char(date_trunc(g, sp.added_at), 'YYYY-MM-DD') AS bucket,
           count(DISTINCT sp.user_id)::bigint AS cnt
    FROM public.shelf_products sp
    WHERE p_since IS NULL OR sp.added_at >= p_since
    GROUP BY 1
  ) q;

  SELECT coalesce(jsonb_agg(jsonb_build_object('date', bucket, 'count', cnt) ORDER BY bucket), '[]'::jsonb)
  INTO chk
  FROM (
    SELECT to_char(date_trunc(g, ce.created_at), 'YYYY-MM-DD') AS bucket,
           count(DISTINCT ce.user_id)::bigint AS cnt
    FROM public.checkout_events ce
    WHERE p_since IS NULL OR ce.created_at >= p_since
    GROUP BY 1
  ) q;

  SELECT coalesce(jsonb_agg(jsonb_build_object('date', bucket, 'count', cnt) ORDER BY bucket), '[]'::jsonb)
  INTO aband
  FROM (
    SELECT to_char(date_trunc(g, cae.created_at), 'YYYY-MM-DD') AS bucket,
           count(DISTINCT cae.user_id)::bigint AS cnt
    FROM public.checkout_abandonment_events cae
    WHERE p_since IS NULL OR cae.created_at >= p_since
    GROUP BY 1
  ) q;

  SELECT coalesce(jsonb_agg(jsonb_build_object('date', bucket, 'count', cnt) ORDER BY bucket), '[]'::jsonb)
  INTO rclk
  FROM (
    SELECT to_char(date_trunc(g, cre.created_at), 'YYYY-MM-DD') AS bucket,
           count(DISTINCT cre.user_id)::bigint AS cnt
    FROM public.checkout_recovery_events cre
    WHERE cre.action = 'click'
      AND (p_since IS NULL OR cre.created_at >= p_since)
    GROUP BY 1
  ) q;

  SELECT coalesce(jsonb_agg(jsonb_build_object('date', bucket, 'count', cnt) ORDER BY bucket), '[]'::jsonb)
  INTO rdis
  FROM (
    SELECT to_char(date_trunc(g, cre.created_at), 'YYYY-MM-DD') AS bucket,
           count(DISTINCT cre.user_id)::bigint AS cnt
    FROM public.checkout_recovery_events cre
    WHERE cre.action = 'dismissed'
      AND (p_since IS NULL OR cre.created_at >= p_since)
    GROUP BY 1
  ) q;

  SELECT coalesce(jsonb_agg(jsonb_build_object('date', bucket, 'count', cnt) ORDER BY bucket), '[]'::jsonb)
  INTO subs
  FROM (
    SELECT to_char(date_trunc(g, sev.created_at), 'YYYY-MM-DD') AS bucket,
           count(DISTINCT sev.user_id)::bigint AS cnt
    FROM public.subscription_events sev
    WHERE sev.status IN ('active', 'trialing')
      AND (p_since IS NULL OR sev.created_at >= p_since)
    GROUP BY 1
  ) q;

  RETURN jsonb_build_object(
    'signups', signups,
    'scans', scans,
    'shelfSaves', shelf,
    'checkouts', chk,
    'checkoutAbandoned', aband,
    'recoveryClicks', rclk,
    'recoveryDismissals', rdis,
    'subscriptions', subs
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_daily_scan_slot(text, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_daily_scan_count(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_daily_scan_slot(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_tip_with_rate_limit(text, text, int, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_funnel_counts(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_funnel_series(timestamptz, text) TO service_role;
