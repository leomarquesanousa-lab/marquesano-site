export function migrateBilling(db) {
  db.exec(`
    CREATE TABLE mp_subscriptions (id TEXT PRIMARY KEY, plan_id TEXT NOT NULL REFERENCES subscription_plans(id), status TEXT NOT NULL, next_payment_date TEXT, payer_email TEXT, updated_at INTEGER NOT NULL);
    CREATE TABLE mp_invoices (id TEXT PRIMARY KEY, subscription_id TEXT NOT NULL REFERENCES mp_subscriptions(id), status TEXT NOT NULL, debit_date TEXT, updated_at INTEGER NOT NULL);
    CREATE TABLE mp_payments (id TEXT PRIMARY KEY, subscription_id TEXT REFERENCES mp_subscriptions(id), invoice_id TEXT REFERENCES mp_invoices(id), status TEXT NOT NULL, status_detail TEXT, amount_cents INTEGER NOT NULL, currency TEXT NOT NULL, paid_at TEXT, updated_at INTEGER NOT NULL);
    CREATE TABLE mp_webhook_events (event_key TEXT PRIMARY KEY, topic TEXT NOT NULL, resource_id TEXT NOT NULL, received_at TEXT NOT NULL);
    CREATE INDEX mp_payment_date ON mp_payments(updated_at DESC);
    CREATE INDEX mp_subscription_date ON mp_subscriptions(updated_at DESC);
  `);
}

export function createBillingStore(db,now=Date.now) {
  const rows=(sql,...args)=>db.prepare(sql).all(...args).map(row=>({...row}));
  return {
    plan(remoteId) { return db.prepare('SELECT id FROM subscription_plans WHERE mercadopago_plan_id=?').get(remoteId)?.id; },
    apply({event,subscription,invoice,payment}) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const received=new Date(now()).toISOString();
        // All changes and the receipt are committed together. A failed delivery can be retried.
        const inserted=db.prepare('INSERT OR IGNORE INTO mp_webhook_events VALUES(?,?,?,?)').run(event.key,event.topic,event.id,received);
        if(subscription) {
          const s=subscription;
          db.prepare(`INSERT INTO mp_subscriptions VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
            status=excluded.status,next_payment_date=excluded.next_payment_date,payer_email=excluded.payer_email,updated_at=excluded.updated_at
            WHERE excluded.updated_at>=mp_subscriptions.updated_at AND excluded.plan_id=mp_subscriptions.plan_id`)
            .run(s.id,s.plan_id,s.status,s.next_payment_date,s.payer_email,s.updated_at);
        }
        if(invoice) {
          const i=invoice;
          db.prepare(`INSERT INTO mp_invoices VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,debit_date=excluded.debit_date,updated_at=excluded.updated_at
            WHERE excluded.updated_at>=mp_invoices.updated_at AND excluded.subscription_id=mp_invoices.subscription_id`).run(i.id,i.subscription_id,i.status,i.debit_date,i.updated_at);
        }
        if(payment) {
          const p=payment;
          db.prepare(`INSERT INTO mp_payments VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
            subscription_id=COALESCE(mp_payments.subscription_id,excluded.subscription_id),invoice_id=COALESCE(mp_payments.invoice_id,excluded.invoice_id),
            status=CASE WHEN excluded.updated_at>=mp_payments.updated_at THEN excluded.status ELSE mp_payments.status END,
            status_detail=CASE WHEN excluded.updated_at>=mp_payments.updated_at THEN excluded.status_detail ELSE mp_payments.status_detail END,
            amount_cents=CASE WHEN excluded.updated_at>=mp_payments.updated_at THEN excluded.amount_cents ELSE mp_payments.amount_cents END,
            currency=CASE WHEN excluded.updated_at>=mp_payments.updated_at THEN excluded.currency ELSE mp_payments.currency END,
            paid_at=CASE WHEN excluded.updated_at>=mp_payments.updated_at THEN excluded.paid_at ELSE mp_payments.paid_at END,
            updated_at=MAX(excluded.updated_at,mp_payments.updated_at)
            WHERE mp_payments.subscription_id IS NULL OR excluded.subscription_id IS NULL OR mp_payments.subscription_id=excluded.subscription_id`)
            .run(p.id,p.subscription_id,p.invoice_id,p.status,p.status_detail,p.amount_cents,p.currency,p.paid_at,p.updated_at);
        }
        db.exec('COMMIT');return {duplicate:!inserted.changes};
      }catch(error){db.exec('ROLLBACK');throw error;}
    },
    report(page=1) {
      const offset=(page-1)*25;
      return {
        page,
        subscriptions:rows('SELECT s.*,p.name AS plan_name FROM mp_subscriptions s JOIN subscription_plans p ON s.plan_id=p.id ORDER BY s.updated_at DESC,s.id LIMIT 25 OFFSET ?',offset),
        payments:rows('SELECT p.*,s.plan_id FROM mp_payments p LEFT JOIN mp_subscriptions s ON p.subscription_id=s.id ORDER BY p.updated_at DESC,p.id LIMIT 25 OFFSET ?',offset),
        invoices:rows('SELECT * FROM mp_invoices ORDER BY updated_at DESC,id LIMIT 25 OFFSET ?',offset),
        totals:{subscriptions:db.prepare('SELECT count(*) n FROM mp_subscriptions').get().n,payments:db.prepare('SELECT count(*) n FROM mp_payments').get().n,invoices:db.prepare('SELECT count(*) n FROM mp_invoices').get().n,events:db.prepare('SELECT count(*) n FROM mp_webhook_events').get().n},
        last_received:db.prepare('SELECT MAX(received_at) value FROM mp_webhook_events').get().value,
      };
    },
  };
}
