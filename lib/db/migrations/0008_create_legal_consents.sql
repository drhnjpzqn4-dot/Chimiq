-- #101: server-side audit trail of legal-terms acceptance.

CREATE TABLE IF NOT EXISTS legal_consents (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  terms_version VARCHAR(32) NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip VARCHAR(64),
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS legal_consents_user_idx
  ON legal_consents (user_id);

CREATE INDEX IF NOT EXISTS legal_consents_user_version_idx
  ON legal_consents (user_id, terms_version);

-- Mirror the latest accepted version on the user record for fast gating
-- without joining legal_consents on every request.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS accepted_terms_version VARCHAR(32);
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS accepted_terms_at TIMESTAMPTZ;
