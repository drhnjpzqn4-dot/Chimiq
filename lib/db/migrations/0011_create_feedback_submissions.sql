CREATE TABLE IF NOT EXISTS feedback_submissions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR,
  email VARCHAR(320),
  message TEXT NOT NULL,
  locale VARCHAR(16),
  page_url TEXT,
  user_agent TEXT,
  ip VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS feedback_submissions_created_idx
  ON feedback_submissions (created_at);
CREATE INDEX IF NOT EXISTS feedback_submissions_user_idx
  ON feedback_submissions (user_id);
