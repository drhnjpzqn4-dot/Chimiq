-- Profile display fields on public.users (app profile store; no separate profiles table).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_emoji TEXT DEFAULT '✨';
