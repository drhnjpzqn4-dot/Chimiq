CREATE TABLE IF NOT EXISTS scan_events (
  id SERIAL PRIMARY KEY,
  product_name VARCHAR(500),
  verdict VARCHAR(16) NOT NULL,
  scan_mode VARCHAR(16) NOT NULL DEFAULT 'single',
  user_id VARCHAR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS scan_events_product_name_idx
  ON scan_events (product_name);
CREATE INDEX IF NOT EXISTS scan_events_verdict_idx
  ON scan_events (verdict);
CREATE INDEX IF NOT EXISTS scan_events_created_at_idx
  ON scan_events (created_at);
