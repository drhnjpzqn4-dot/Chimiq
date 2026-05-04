CREATE TABLE IF NOT EXISTS "checkout_recovery_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" varchar NOT NULL,
  "action" varchar(32) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "checkout_recovery_events_user_id_idx" ON "checkout_recovery_events" ("user_id");
CREATE INDEX IF NOT EXISTS "checkout_recovery_events_action_idx" ON "checkout_recovery_events" ("action");
CREATE INDEX IF NOT EXISTS "checkout_recovery_events_created_at_idx" ON "checkout_recovery_events" ("created_at");
