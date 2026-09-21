import { DatabaseSync } from 'node:sqlite';
import { createAdminStore, adminDiagnostic } from '../server/admin/core.mjs';
import { openPostgres } from '../server/admin/postgres.mjs';
import { initialPlans } from '../config/plans.mjs';
import { checkoutPlans } from '../config/checkout-plans.mjs';
import { loadLocalCheckoutEnv } from './local-env.mjs';

// Explicit local recovery tool. SQLite is read-only; runtime remains PostgreSQL.
loadLocalCheckoutEnv();
let source, db;
try {
  if (process.argv[2] !== '--sqlite' || !process.argv[3] || process.argv.length !== 4) throw Error('Use --sqlite <backup>.');
  source = new DatabaseSync(process.argv[3], { readOnly: true });
  source.exec('PRAGMA query_only=ON; BEGIN');
  db = await openPostgres(process.env.DATABASE_URL);
  await createAdminStore(process.env.DATABASE_URL, Date.now, { open: async () => db });
  await db.transaction(async () => {
    for (const seed of initialPlans) {
      const row = source.prepare('SELECT * FROM subscription_plans WHERE id=?').get(seed.id);
      if (!row) continue;
      if (row.monthly_price_cents !== null && (!Number.isSafeInteger(row.monthly_price_cents) || row.monthly_price_cents <= 0)) throw Error('Invalid stored price.');
      const display = Object.values(checkoutPlans).find(plan => plan.storedId === seed.id);
      // Only replace untouched seed rows. Never replace an already edited plan.
      await db.prepare(`UPDATE subscription_plans SET name=?,description=?,monthly_price_cents=?,cycles=?,active=?,
        mercadopago_plan_id=?,revision=?,synced_revision=?,sync_state=?,sync_started=?
        WHERE id=? AND revision=1 AND sync_state='pending' AND mercadopago_plan_id IS NULL
        AND monthly_price_cents IS NOT DISTINCT FROM ? AND cycles=? AND active=?`).run(
        display.name, row.description, row.monthly_price_cents, row.cycles, row.active,
        row.mercadopago_plan_id, row.revision, row.synced_revision, row.sync_state, row.sync_started,
        seed.id, seed.monthly_price_cents, seed.cycles, Number(seed.active));
    }
  });
  console.info('PLAN_CATALOG_RECOVERED', (await db.query('SELECT id,name,monthly_price_cents,cycles,active,mercadopago_plan_id,sync_state FROM subscription_plans ORDER BY id')).rows);
} catch (error) { adminDiagnostic('PLAN_CATALOG_RECOVERY_FAILED', error); process.exitCode = 1; }
finally { source?.close(); await db?.close(); }
