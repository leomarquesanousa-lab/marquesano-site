export async function migrateSales(db) {
  await db.exec(`
    ALTER TABLE mp_subscriptions ADD COLUMN created_at TEXT;
    ALTER TABLE mp_subscriptions ADD COLUMN external_reference TEXT;
    ALTER TABLE mp_subscriptions ADD COLUMN amount_cents BIGINT;
    ALTER TABLE mp_subscriptions ADD COLUMN currency TEXT;
    ALTER TABLE mp_subscriptions ADD COLUMN cycles BIGINT;
    ALTER TABLE mp_subscriptions ADD COLUMN end_date TEXT;
    ALTER TABLE mp_subscriptions ADD COLUMN cancelled_at TEXT;
    ALTER TABLE mp_payments ADD COLUMN created_at TEXT;
    ALTER TABLE mp_payments ADD COLUMN payment_method TEXT;
    ALTER TABLE mp_payments ADD COLUMN last_four TEXT;
    ALTER TABLE mp_payments ADD COLUMN external_reference TEXT;
    ALTER TABLE mp_payments ADD COLUMN refunded_at TEXT;
    ALTER TABLE mp_payments ADD COLUMN refunded_cents BIGINT NOT NULL DEFAULT 0;
    CREATE TABLE sales_notifications (
      id TEXT PRIMARY KEY, subscription_id TEXT NOT NULL REFERENCES mp_subscriptions(id),
      type TEXT NOT NULL, recipient TEXT NOT NULL, snapshot TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'PENDING', created_at TEXT NOT NULL,
      first_attempt BIGINT, lease_until BIGINT, provider_id TEXT, sent_at TEXT);
    CREATE INDEX sales_notification_pending ON sales_notifications(state,created_at);
    CREATE INDEX sales_subscription_next ON mp_subscriptions(next_payment_date);
    CREATE INDEX sales_payment_subscription ON mp_payments(subscription_id);
    UPDATE mp_subscriptions s SET created_at=to_char(to_timestamp(a.created_at/1000.0) AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      amount_cents=a.amount_cents, currency='BRL', external_reference=a.id,
      cycles=CASE WHEN a.terms_version='2026-09-checkout-12-months' THEN 12 ELSE NULL END
      FROM checkout_attempts a WHERE a.subscription_id=s.id AND a.state='authorized';
  `);
}
