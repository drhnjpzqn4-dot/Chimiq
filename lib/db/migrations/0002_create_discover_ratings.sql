-- Create the discover_ratings table for the "Was this helpful?" prompt on
-- Discover articles. See task #56 and lib/db/src/schema/discover-ratings.ts.

CREATE TABLE IF NOT EXISTS discover_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(200) NOT NULL,
  kind VARCHAR(16) NOT NULL,
  rating VARCHAR(8) NOT NULL,
  comment TEXT,
  voter_key VARCHAR(128) NOT NULL,
  user_id UUID,
  user_agent VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS discover_ratings_unique_voter
  ON discover_ratings (slug, kind, voter_key);

CREATE INDEX IF NOT EXISTS discover_ratings_slug_kind_idx
  ON discover_ratings (slug, kind);

CREATE INDEX IF NOT EXISTS discover_ratings_created_at_idx
  ON discover_ratings (created_at);
