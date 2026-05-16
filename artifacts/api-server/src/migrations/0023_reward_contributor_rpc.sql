-- Atomic contribution reward grant used by api-server after moving off Drizzle.
-- Preserves the previous CAS pattern:
--   1. Claim reward_granted=false -> true exactly once per submission.
--   2. Increment the contributor count only for the successful claimant.
--   3. Grant 30 days Premium on every 30th accepted contribution.

CREATE OR REPLACE FUNCTION public.reward_contributor_idempotent(
  submission_id uuid,
  user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_submission_id uuid := reward_contributor_idempotent.submission_id;
  v_user_id text := reward_contributor_idempotent.user_id::text;
  v_claimed uuid;
  v_count int := 0;
  v_premium_until timestamptz := NULL;
BEGIN
  UPDATE public.user_submitted_products
  SET reward_granted = true
  WHERE id = v_submission_id
    AND reward_granted = false
  RETURNING id INTO v_claimed;

  IF v_claimed IS NULL THEN
    SELECT COALESCE(accepted_contributions, 0)
    INTO v_count
    FROM public.users
    WHERE id = v_user_id;

    RETURN jsonb_build_object(
      'premiumUnlocked', false,
      'premiumUntil', NULL,
      'totalContributions', COALESCE(v_count, 0),
      'alreadyGranted', true
    );
  END IF;

  UPDATE public.users
  SET accepted_contributions = accepted_contributions + 1
  WHERE id = v_user_id
  RETURNING accepted_contributions INTO v_count;

  v_count := COALESCE(v_count, 0);

  IF v_count > 0 AND v_count % 30 = 0 THEN
    v_premium_until := now() + interval '30 days';

    UPDATE public.users
    SET premium_until = v_premium_until
    WHERE id = v_user_id;

    RETURN jsonb_build_object(
      'premiumUnlocked', true,
      'premiumUntil', v_premium_until,
      'totalContributions', v_count,
      'alreadyGranted', false
    );
  END IF;

  RETURN jsonb_build_object(
    'premiumUnlocked', false,
    'premiumUntil', NULL,
    'totalContributions', v_count,
    'alreadyGranted', false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reward_contributor_idempotent(uuid, uuid) TO service_role;
