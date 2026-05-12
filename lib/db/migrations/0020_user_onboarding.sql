-- V10 onboarding profile fields (run manually when deploying; safe to re-run).
ALTER TABLE users ADD COLUMN IF NOT EXISTS skin_type VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS age_group VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS skin_goal VARCHAR;

ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN;
UPDATE users SET onboarding_completed = true WHERE onboarding_completed IS NULL;
ALTER TABLE users ALTER COLUMN onboarding_completed SET DEFAULT false;
ALTER TABLE users ALTER COLUMN onboarding_completed SET NOT NULL;
