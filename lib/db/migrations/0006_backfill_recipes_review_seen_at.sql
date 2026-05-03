-- Backfill review_seen_at from the legacy per-user users.recipes_seen_at
-- so existing users don't see a flood of "new" notifications for reviews
-- they already acknowledged before the per-recipe model rolled out (#70).
--
-- Rule: if the submitter had already acked at time T (recipes_seen_at = T),
-- then any of their recipes whose admin review happened at or before T is
-- considered already-seen and gets review_seen_at = T. Recipes reviewed
-- AFTER T remain unseen and will surface in the new banner as expected.

UPDATE recipes r
SET review_seen_at = u.recipes_seen_at
FROM users u
WHERE r.submitter_id = u.id
  AND u.recipes_seen_at IS NOT NULL
  AND r.reviewed_at IS NOT NULL
  AND r.reviewed_at <= u.recipes_seen_at
  AND r.review_seen_at IS NULL;
