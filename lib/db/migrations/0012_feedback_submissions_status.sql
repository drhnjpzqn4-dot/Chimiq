ALTER TABLE feedback_submissions
  ADD COLUMN IF NOT EXISTS status VARCHAR(16) NOT NULL DEFAULT 'new';

CREATE INDEX IF NOT EXISTS feedback_submissions_status_idx
  ON feedback_submissions (status);
