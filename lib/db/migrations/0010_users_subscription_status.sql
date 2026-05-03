-- Mirror Stripe subscription state directly on the user row so the admin
-- Users dashboard can show "in trial / paid / free / cancelled" without
-- making one Stripe API call per row. Webhooks (stripeUserSync.ts) keep
-- these columns in sync going forward; rows for users who haven't had
-- any subscription activity since this migration just stay null and
-- render as "—" in the UI.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS subscription_status varchar,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamp with time zone;
