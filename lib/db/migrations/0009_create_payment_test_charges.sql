-- #107: audit rows for admin "Test live charge" go-live verification.
--
-- Each click of the admin button inserts a row keyed by the PaymentIntent id
-- BEFORE the refund is issued, so the webhook handler can recognize the
-- resulting charge.refunded as a verification ping (not a real cancellation)
-- and the UI can poll for end-to-end delivery confirmation.

CREATE TABLE IF NOT EXISTS payment_test_charges (
  payment_intent_id    VARCHAR PRIMARY KEY,
  user_id              VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id   VARCHAR NOT NULL,
  charge_id            VARCHAR,
  refund_id            VARCHAR,
  livemode             VARCHAR(8) NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  webhook_received_at  TIMESTAMPTZ,
  webhook_event_id     VARCHAR
);

CREATE INDEX IF NOT EXISTS payment_test_charges_charge_idx
  ON payment_test_charges (charge_id);

CREATE INDEX IF NOT EXISTS payment_test_charges_user_idx
  ON payment_test_charges (user_id);
