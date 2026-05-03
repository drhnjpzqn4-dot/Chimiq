-- Per-recipe acknowledgment timestamp powering the contributor
-- notification banner (#70). A reviewed recipe is "unseen" when
-- review_seen_at is NULL or strictly older than reviewed_at. Tapping
-- the notification (or visiting RecipeDetail / the edit form) sets
-- review_seen_at = now() for that single recipe, so users only ever
-- ack the notifications they actually look at.

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS review_seen_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_recipes_unseen_review
  ON recipes (submitter_id)
  WHERE reviewed_at IS NOT NULL
    AND (review_seen_at IS NULL OR review_seen_at < reviewed_at);
