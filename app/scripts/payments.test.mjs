import { createTestAdminStore as createAdminStore } from './postgres-test-store.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server.js';
import { cookieName } from '../server/admin/core.mjs';
import { syncPlan, startCheckout, checkoutUrl } from '../server/admin/mercadopago.mjs';
import { handleAdminApi } from '../server/admin/api.mjs';

const env = { NODE_ENV: 'production', ADMIN_SITE_ORIGIN: 'https://marquesano.com.br', DATABASE_URL: 'postgresql://isolated/test', MERCADOPAGO_ACCESS_TOKEN: 'test-secret-not-real' };
async function fixture(t) {
  const store = await createAdminStore(':memory:');t.after(async () => await store.close());
  const plans = store.repository.plans,calls = [],remote = new Map();
  const fetcher = async (url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer ' + env.MERCADOPAGO_ACCESS_TOKEN);
    assert(url.startsWith('https://api.mercadopago.com/preapproval_plan'));
    calls.push({ url, ...options });const method = options.method;
    let id = url.split('/').pop();
    if (method === 'POST') id = 'mp_plan_' + (remote.size + 1);
    if (method === 'POST' || method === 'PUT') remote.set(id, { ...JSON.parse(options.body), id, status: JSON.parse(options.body).status || 'active', init_point: 'https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=' + id });
    return { ok: true, json: async () => remote.get(id) };
  };
  return { store, plans, calls, remote, options: { env, fetcher } };
}
const edit = async (plans, id, changes) => await plans.save(id, { ...(await plans.get(id)), ...changes });

test('three stable plans; only existing entry price seeded; validation and revision checks', async (t) => {
  const { plans } = await fixture(t);
  assert.deepEqual((await plans.list()).map((p) => [p.id, p.monthly_price_cents]), [['basico', 9900], ['intermediario', null], ['professional', null]]);
  await assert.rejects(async () => await edit(plans, 'intermediario', { active: true }));
  for (const price of [-1, 0, 1.5, '99', NaN]) await assert.rejects(async () => await edit(plans, 'basico', { monthly_price_cents: price }));
  await assert.rejects(async () => await edit(plans, 'basico', { cycles: 0 }));
  const stale = await plans.get('basico');await edit(plans, 'basico', { cycles: 6 });await assert.rejects(async () => await plans.save('basico', stale), /mudou/);
  await assert.rejects(async () => await plans.get('unknown'));
});

test('independent creation, stored provider IDs, repeat sync updates only selected plan, correct checkout', async (t) => {
  const { plans, calls, options } = await fixture(t);
  // Arbitrary fixture amounts only; not production defaults.
  await edit(plans, 'intermediario', { monthly_price_cents: 12345, cycles: 6, active: true });
  await edit(plans, 'professional', { monthly_price_cents: 45678, cycles: 18, active: true });
  for (const id of ['basico', 'intermediario', 'professional']) await syncPlan(plans, id, options);
  assert.equal(new Set((await plans.list()).map((p) => p.mercadopago_plan_id)).size, 3);
  assert.deepEqual(calls.filter((c) => c.method === 'POST').map((c) => JSON.parse(c.body).auto_recurring.transaction_amount), [99, 123.45, 456.78]);
  const basicBefore = await plans.get('basico');
  await edit(plans, 'intermediario', { monthly_price_cents: 20001 });await syncPlan(plans, 'intermediario', options);
  assert.deepEqual(await plans.get('basico'), basicBefore);
  assert.equal(calls.filter((c) => c.method === 'POST').length, 3);
  assert.equal(calls.filter((c) => c.method === 'PUT').length, 1);
  for (const plan of await plans.list()) assert.equal(await new URL(await startCheckout(plans, plan.id, plan.revision, options)).searchParams.get('preapproval_plan_id'), plan.mercadopago_plan_id);
});

test('unconfigured, unsynced, inactive and stale plans never reach checkout', async (t) => {
  const { plans, options, calls } = await fixture(t);
  await assert.rejects(syncPlan(plans, 'basico', { env: {} }), /ACCESS_TOKEN/);
  await assert.rejects(syncPlan(plans, 'intermediario', options), /preço/);
  await assert.rejects(startCheckout(plans, 'basico', 1, options));assert.equal(calls.length, 0);
  await syncPlan(plans, 'basico', options);
  await assert.rejects(startCheckout(plans, 'basico', 999, options), /mudaram/);
  await edit(plans, 'basico', { active: false });await assert.rejects(startCheckout(plans, 'basico', (await plans.get('basico')).revision, options));
  await syncPlan(plans, 'basico', options);assert.equal(JSON.parse(calls.findLast((c) => c.method === 'PUT').body).status, 'inactive');
});

test('checkout rejects remote price/cycle/currency drift and unsafe redirect', async (t) => {
  const { plans, options, remote } = await fixture(t);await syncPlan(plans, 'basico', options);const p = await plans.get('basico'),original = structuredClone(remote.get(p.mercadopago_plan_id));
  for (const change of [{ transaction_amount: 1 }, { currency_id: 'USD' }, { frequency: 2 }, { repetitions: 999 }, { free_trial: { frequency: 1 } }, { billing_day_proportional: true }]) {
    remote.set(p.mercadopago_plan_id, { ...original, auto_recurring: { ...original.auto_recurring, ...change } });
    await assert.rejects(startCheckout(plans, p.id, p.revision, options), /difere/);
  }
  for (const url of ['https://evil.example/subscriptions/checkout?preapproval_plan_id=x', 'javascript:alert(1)', 'https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=other']) await assert.rejects(async () => checkoutUrl({ id: 'x', init_point: url }));
});

test('ambiguous create cannot be retried as a new POST; explicit linking permits recovery', async (t) => {
  const { plans, options } = await fixture(t);let calls = 0;
  const fail = { env, fetcher: async () => {calls++;throw Error('private-token-provider-message');} };
  await assert.rejects(syncPlan(plans, 'basico', fail), (e) => !e.message.includes('private-token'));
  await assert.rejects(syncPlan(plans, 'basico', fail), /sem confirmação/);assert.equal(calls, 1);
  await edit(plans, 'basico', { description: 'Edited after timeout' });
  await assert.rejects(syncPlan(plans, 'basico', fail), /sem confirmação/);
  await edit(plans, 'basico', { mercadopago_plan_id: 'existing_plan_123' });
  await syncPlan(plans, 'basico', options);assert.equal((await plans.get('basico')).sync_state, 'synced');
});

test('concurrent sync/edits blocked; a definite rejected create can be retried', async (t) => {
  const { plans, options } = await fixture(t);const first = await plans.start('basico');await assert.rejects(async () => await plans.start('basico'), /já/);await assert.rejects(async () => await edit(plans, 'basico', { cycles: 4 }), /Aguarde/);await plans.fail(first, false);
  await assert.rejects(syncPlan(plans, 'basico', { env, fetcher: async () => ({ ok: false, status: 401 }) }), /Credencial/);
  assert.equal((await plans.get('basico')).sync_state, 'error');await syncPlan(plans, 'basico', options);
  await assert.rejects(async () => await edit(plans, 'intermediario', { mercadopago_plan_id: (await plans.get('basico')).mercadopago_plan_id }), /outro plano/);
});

test('admin endpoints enforce session, OWNER/ADMIN, origin and payload; no secrets in response', async (t) => {
  const { store, options } = await fixture(t);
  await store.createOwner('owner@example.com', 'test-password-123');const owner = await store.authenticate('owner@example.com', 'test-password-123'),token = await store.createSession(owner.id);
  function req(path, { method = 'GET', origin = env.ADMIN_SITE_ORIGIN, session = token, body } = {}) {return new NextRequest(env.ADMIN_SITE_ORIGIN + '/api/admin/' + path, { method, headers: { Origin: origin, 'Content-Type': 'application/json', ...(session ? { Cookie: cookieName(env) + '=' + session } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });}
  const base = 'configuracoes/pagamentos',invoke = (path, opts = {}, customStore = store) => handleAdminApi(req(path, opts), path.split('/'), { store: customStore, ...options });
  assert.equal((await invoke(base, { session: null })).status, 401);
  assert.equal((await invoke(base, {}, { ...store, getSession: () => ({ ...owner, role: 'VIEWER' }) })).status, 403);
  assert.equal((await invoke(base + '/basico', { method: 'PATCH', origin: 'https://evil.example', body: {} })).status, 403);
  const response = await invoke(base);const result = await response.json();assert.equal(result.plans.length, 3);assert(!JSON.stringify(result).includes(env.MERCADOPAGO_ACCESS_TOKEN));
  assert.equal((await invoke(base + '/basico/sync', { method: 'POST', body: {} })).status, 200);
  const p = await store.repository.plans.get('basico');assert.equal((await invoke(base + '/basico', { method: 'PATCH', body: { ...p, monthly_price_cents: 10900 } })).status, 200);
});
