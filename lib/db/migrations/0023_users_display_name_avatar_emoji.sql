-- Profile display fields on public.users (app profile store; no separate profiles table).
-- display_name: optional override; NULL falls back to first_name from auth/onboarding.
-- avatar_emoji: single emoji shown in the native app profile header.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_emoji TEXT DEFAULT '✨';
