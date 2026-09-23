import { queueSalesMail, createSalesMailStore } from './sales-mail.mjs';
export async function migrateBilling(db) {
  await db.exec(`
    CREATE TABLE mp_subscriptions (id TEXT PRIMARY KEY, plan_id TEXT NOT NULL REFERENCES subscription_plans(id), status TEXT NOT NULL, next_payment_date TEXT, payer_email TEXT, updated_at BIGINT NOT NULL);
    CREATE TABLE mp_invoices (id TEXT PRIMARY KEY, subscription_id TEXT NOT NULL REFERENCES mp_subscriptions(id), status TEXT NOT NULL, debit_date TEXT, updated_at BIGINT NOT NULL);
    CREATE TABLE mp_payments (id TEXT PRIMARY KEY, subscription_id TEXT REFERENCES mp_subscriptions(id), invoice_id TEXT REFERENCES mp_invoices(id), status TEXT NOT NULL, status_detail TEXT, amount_cents BIGINT NOT NULL, currency TEXT NOT NULL, paid_at TEXT, updated_at BIGINT NOT NULL);
    CREATE TABLE mp_webhook_events (event_key TEXT PRIMARY KEY, topic TEXT NOT NULL, resource_id TEXT NOT NULL, received_at TEXT NOT NULL);
    CREATE INDEX mp_payment_date ON mp_payments(updated_at DESC);
    CREATE INDEX mp_subscription_date ON mp_subscriptions(updated_at DESC);
  `);
}

export function createBillingStore(db, now = Date.now) {
  const rows = async (sql, ...args) => (await db.prepare(sql).all(...args)).map((row) => ({ ...row }));
  return {
    notifications: createSalesMailStore(db, now),
    async plan(remoteId) {return (await db.prepare('SELECT id FROM subscription_plans WHERE mercadopago_plan_id=?').get(remoteId))?.id;},
    apply({ event, subscription, invoice, payment }) {
      return db.transaction(async () => {
        const received = new Date(now()).toISOString();
        // All changes and the receipt are committed together. A failed delivery can be retried.
        const inserted = await db.prepare('INSERT INTO mp_webhook_events VALUES(?,?,?,?) ON CONFLICT DO NOTHING').run(event.key, event.topic, event.id, received);
        const beforeSubscription = subscription ? await db.prepare('SELECT * FROM mp_subscriptions WHERE id=?').get(subscription.id) : null;
        const beforePayment = payment ? await db.prepare('SELECT * FROM mp_payments WHERE id=?').get(payment.id) : null;
        if (subscription) {
          const s = subscription;
          await db.prepare(`INSERT INTO mp_subscriptions(id,plan_id,status,next_payment_date,payer_email,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
            status=excluded.status,next_payment_date=excluded.next_payment_date,payer_email=excluded.payer_email,updated_at=excluded.updated_at
            WHERE excluded.updated_at>=mp_subscriptions.updated_at AND excluded.plan_id=mp_subscriptions.plan_id`).
          run(s.id, s.plan_id, s.status, s.next_payment_date, s.payer_email, s.updated_at);
          await db.prepare(`UPDATE mp_subscriptions SET created_at=COALESCE(created_at,?),external_reference=COALESCE(external_reference,?),
            amount_cents=COALESCE(?,amount_cents),currency=COALESCE(?,currency),cycles=COALESCE(?,cycles),
            end_date=COALESCE(?,end_date),cancelled_at=COALESCE(cancelled_at,?) WHERE id=? AND updated_at=? AND plan_id=?`)
            .run(s.created_at??null,s.external_reference??null,s.amount_cents??null,s.currency??null,s.cycles??null,s.end_date??null,s.cancelled_at??null,s.id,s.updated_at,s.plan_id);
        }
        if (invoice) {
          const i = invoice;
          await db.prepare(`INSERT INTO mp_invoices VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,debit_date=excluded.debit_date,updated_at=excluded.updated_at
            WHERE excluded.updated_at>=mp_invoices.updated_at AND excluded.subscription_id=mp_invoices.subscription_id`).run(i.id, i.subscription_id, i.status, i.debit_date, i.updated_at);
        }
        if (payment) {
          const p = payment;
          await db.prepare(`INSERT INTO mp_payments(id,subscription_id,invoice_id,status,status_detail,amount_cents,currency,paid_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
            subscription_id=COALESCE(mp_payments.subscription_id,excluded.subscription_id),invoice_id=COALESCE(mp_payments.invoice_id,excluded.invoice_id),
            status=CASE WHEN excluded.updated_at>=mp_payments.updated_at THEN excluded.status ELSE mp_payments.status END,
            status_detail=CASE WHEN excluded.updated_at>=mp_payments.updated_at THEN excluded.status_detail ELSE mp_payments.status_detail END,
            amount_cents=CASE WHEN excluded.updated_at>=mp_payments.updated_at THEN excluded.amount_cents ELSE mp_payments.amount_cents END,
            currency=CASE WHEN excluded.updated_at>=mp_payments.updated_at THEN excluded.currency ELSE mp_payments.currency END,
            paid_at=CASE WHEN excluded.updated_at>=mp_payments.updated_at THEN excluded.paid_at ELSE mp_payments.paid_at END,
            updated_at=GREATEST(excluded.updated_at,mp_payments.updated_at)
            WHERE mp_payments.subscription_id IS NULL OR excluded.subscription_id IS NULL OR mp_payments.subscription_id=excluded.subscription_id`).
          run(p.id, p.subscription_id, p.invoice_id, p.status, p.status_detail, p.amount_cents, p.currency, p.paid_at, p.updated_at);
          await db.prepare(`UPDATE mp_payments SET created_at=COALESCE(created_at,?),payment_method=COALESCE(?,payment_method),
            last_four=COALESCE(?,last_four),external_reference=COALESCE(?,external_reference),
            refunded_at=COALESCE(?,refunded_at),refunded_cents=COALESCE(?,refunded_cents) WHERE id=? AND updated_at=?`)
            .run(p.created_at??null,p.payment_method??null,/^\d{4}$/.test(p.last_four||'')?p.last_four:null,p.external_reference??null,p.refunded_at??null,p.refunded_cents??null,p.id,p.updated_at);
        }
        if (subscription && subscription.updated_at >= (beforeSubscription?.updated_at ?? 0) && (!beforeSubscription || beforeSubscription.plan_id===subscription.plan_id)) {
          if (subscription.status==='authorized' && beforeSubscription?.status!=='authorized') await queueSalesMail(db,'welcome',subscription.id,subscription.id,null,now);
          if (subscription.status==='cancelled' && beforeSubscription?.status!=='cancelled') await queueSalesMail(db,'cancelled',subscription.id,subscription.id,null,now);
        }
        if (payment && payment.updated_at >= (beforePayment?.updated_at ?? 0) && ['approved','rejected'].includes(payment.status) && (!beforePayment || beforePayment.status!==payment.status || !beforePayment.subscription_id)) {
          const stored=await db.prepare('SELECT * FROM mp_payments WHERE id=?').get(payment.id);
          if (stored.subscription_id && stored.status===payment.status) await queueSalesMail(db,payment.status,payment.id,stored.subscription_id,stored,now);
        }
        return { duplicate: !inserted.changes, new_payment:Boolean(payment && !beforePayment) };
      });
    },
    async report(page = 1) {
      const offset = (page - 1) * 25;
      return {
        page,
        subscriptions: await rows('SELECT s.*,p.name AS plan_name FROM mp_subscriptions s JOIN subscription_plans p ON s.plan_id=p.id ORDER BY s.updated_at DESC,s.id LIMIT 25 OFFSET ?', offset),
        payments: await rows('SELECT p.*,s.plan_id FROM mp_payments p LEFT JOIN mp_subscriptions s ON p.subscription_id=s.id ORDER BY p.updated_at DESC,p.id LIMIT 25 OFFSET ?', offset),
        invoices: await rows('SELECT * FROM mp_invoices ORDER BY updated_at DESC,id LIMIT 25 OFFSET ?', offset),
        totals: { subscriptions: (await db.prepare('SELECT count(*) n FROM mp_subscriptions').get()).n, payments: (await db.prepare('SELECT count(*) n FROM mp_payments').get()).n, invoices: (await db.prepare('SELECT count(*) n FROM mp_invoices').get()).n, events: (await db.prepare('SELECT count(*) n FROM mp_webhook_events').get()).n },
        last_received: (await db.prepare('SELECT MAX(received_at) value FROM mp_webhook_events').get()).value
      };
    }
  };
}
