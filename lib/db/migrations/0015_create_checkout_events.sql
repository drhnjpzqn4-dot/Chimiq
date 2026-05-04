CREATE TABLE IF NOT EXISTS checkout_events (
  id            SERIAL PRIMARY KEY,
  user_id       VARCHAR NOT NULL,
  plan_type     VARCHAR(32) NOT NULL,
  source        VARCHAR(64),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS checkout_events_user_id_idx ON checkout_events (user_id);
CREATE INDEX IF NOT EXISTS checkout_events_created_at_idx ON checkout_events (created_at);
