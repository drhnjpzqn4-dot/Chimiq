CREATE TABLE IF NOT EXISTS subscription_events (
  id                      SERIAL PRIMARY KEY,
  user_id                 VARCHAR NOT NULL,
  stripe_customer_id      VARCHAR NOT NULL,
  stripe_subscription_id  VARCHAR NOT NULL,
  status                  VARCHAR(32) NOT NULL,
  event_type              VARCHAR(64) NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscription_events_user_id_idx ON subscription_events (user_id);
CREATE INDEX IF NOT EXISTS subscription_events_created_at_idx ON subscription_events (created_at);
CREATE INDEX IF NOT EXISTS subscription_events_status_idx ON subscription_events (status);
