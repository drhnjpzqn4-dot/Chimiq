CREATE TABLE IF NOT EXISTS daily_scan_counts (
  user_id VARCHAR NOT NULL,
  scan_date DATE NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, scan_date)
);

CREATE INDEX IF NOT EXISTS daily_scan_counts_user_idx
  ON daily_scan_counts (user_id);
