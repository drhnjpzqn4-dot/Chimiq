CREATE TABLE IF NOT EXISTS tester_promo_changes (
  id SERIAL PRIMARY KEY,
  action VARCHAR(16) NOT NULL,
  admin_email VARCHAR(320) NOT NULL,
  old_code VARCHAR(64),
  old_max_redemptions INTEGER,
  old_promotion_code_id VARCHAR(64),
  new_code VARCHAR(64) NOT NULL,
  new_max_redemptions INTEGER,
  new_promotion_code_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tester_promo_changes_created_idx
  ON tester_promo_changes (created_at);
