import test from 'node:test';
import assert from 'node:assert/strict';
import { testStore } from './postgres-test-store.mjs';
import { migrate } from '../server/admin/migrations.mjs';
import { checkoutPlans } from '../config/checkout-plans.mjs';

test('migration repairs missing catalog rows without overwriting saved prices, IDs or activity', async t => {
  const { store, db } = await testStore(); t.after(() => store.close());
  await db.exec("DELETE FROM schema_migrations WHERE version=6; DELETE FROM subscription_plans WHERE id='intermediario'");
  await db.prepare("UPDATE subscription_plans SET monthly_price_cents=12500,mercadopago_plan_id='existing_provider',active=0 WHERE id='basico'").run();
  await migrate(db); await migrate(db);
  const records = await store.repository.plans.list();
  assert.equal(records.length, 3);
  assert.deepEqual(Object.keys(checkoutPlans), ['basico','professional','business']);
  assert.equal(records.find(row => row.id === checkoutPlans.professional.storedId).name, 'Professional');
  assert.equal(records.find(row => row.id === checkoutPlans.business.storedId).name, 'Business');
  const basic = records.find(row => row.id === 'basico');
  assert.equal(basic.monthly_price_cents, 12500);
  assert.equal(basic.mercadopago_plan_id, 'existing_provider');
  assert.equal(basic.active, false);
  assert.equal((await db.prepare('SELECT count(*) AS n FROM users').get()).n, 0);
});
