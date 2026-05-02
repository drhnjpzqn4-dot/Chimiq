-- Append-only log of recipe submit/edit actions, used to enforce the
-- per-user 5-actions-per-24h limit atomically (see task #69 hardening).
-- One row per "create" and one per "edit" — counting rows in the last
-- 24h gives the true number of LLM-scan-triggering actions.

CREATE TABLE IF NOT EXISTS recipe_edit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitter_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_id VARCHAR NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  action VARCHAR(16) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipe_edit_events_submitter_created
  ON recipe_edit_events (submitter_id, created_at);
