import test from 'node:test';
import assert from 'node:assert/strict';
import { testStore } from './postgres-test-store.mjs';
import { hashPassword } from '../server/admin/core.mjs';
import { migrate } from '../server/admin/migrations.mjs';

test('PostgreSQL schema, OWNER, login, session, repository, plans and billing', async () => {
  const { store, db } = await testStore();
  try {
    await migrate(db); await migrate(db);
    const hash = await hashPassword('isolated-test-password');
    const env = { ADMIN_INITIAL_OWNER_EMAIL: 'owner@example.invalid', ADMIN_INITIAL_OWNER_PASSWORD_HASH: hash };
    assert.equal(await store.ensureInitialOwner(env), true);
    assert.equal(await store.ensureInitialOwner(env), false);
    const user = await store.authenticate(env.ADMIN_INITIAL_OWNER_EMAIL, 'isolated-test-password');
    assert.equal(user.role, 'OWNER');
    const token = await store.createSession(user.id);
    assert.deepEqual(await store.getSession(token), user);
    assert.equal(await store.consumeLogin(user.email), true);
    const repo = store.repository;
    await repo.audit(user, 'test', 'users', user.id);
    assert.equal((await repo.plans.list()).length, 3);
    const p = await repo.plans.get('basico');
    await repo.plans.finish(await repo.plans.start('basico'), 'mock_provider_123');
    assert.equal(await repo.billing.plan('mock_provider_123'), p.id);
    const event = {event:{key:'event1',topic:'payment',id:'pay1'},subscription:{id:'sub1',plan_id:p.id,status:'authorized',next_payment_date:null,payer_email:null,updated_at:Date.now()},payment:{id:'pay1',subscription_id:'sub1',invoice_id:null,status:'approved',status_detail:null,amount_cents:9900,currency:'BRL',paid_at:null,updated_at:Date.now()}};
    assert.equal((await repo.billing.apply(event)).duplicate, false);
    assert.equal((await repo.billing.apply(event)).duplicate, true);
    assert.equal((await repo.billing.report()).totals.payments, 1);
    await repo.saveSettings({TRACKING_ENABLED:'true'}, user);
    assert.equal((await repo.settings()).TRACKING_ENABLED, 'true');
    const period={from:'2000-01-01',until:'2100-01-01'};
    await repo.report(period);
    for(const module of ['leads','clientes','campanhas','formularios','auditoria','usuarios']) await repo.list(module,new URLSearchParams(),period);
    await store.revokeSession(token);
    assert.equal(await store.getSession(token),null);
  } finally { await store.close(); }
});
