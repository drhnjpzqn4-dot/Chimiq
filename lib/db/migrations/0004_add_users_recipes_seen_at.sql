-- Per-user "I've seen the latest review feedback on my recipes" timestamp.
-- Powers the notification dot on the Profile -> Your DIY recipes section
-- (#70). A recipe row is "unseen" when it has been reviewed AT or AFTER
-- this timestamp (or the user has never opened the section).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS recipes_seen_at TIMESTAMPTZ;
