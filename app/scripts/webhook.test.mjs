import { createTestAdminStore as createAdminStore } from './postgres-test-store.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { NextRequest } from 'next/server.js';
import { cookieName } from '../server/admin/core.mjs';
import { handleMercadoPagoWebhook, webhookConfiguration } from '../server/admin/mercadopago-webhook.mjs';
import { handleAdminApi } from '../server/admin/api.mjs';

const env = { NODE_ENV: 'production', MERCADOPAGO_SITE_ORIGIN: 'https://marquesano.com.br', ADMIN_SITE_ORIGIN: 'https://marquesano.com.br', DATABASE_URL: 'postgresql://isolated/test', MERCADOPAGO_ACCESS_TOKEN: 'mock-access-token', MERCADOPAGO_WEBHOOK_SECRET: 'mock-webhook-secret' };
const stamp = '2026-09-20T10:00:00Z';
function notification(type, id, { secret = env.MERCADOPAGO_WEBHOOK_SECRET, body = {}, query = id, requestId = 'request-1', ts = '1789900000', signature } = {}) {
  const hash = createHmac('sha256', secret).update(`id:${String(query).toLowerCase()};request-id:${requestId};ts:${ts};`).digest('hex');
  return new Request(env.ADMIN_SITE_ORIGIN + '/api/mercadopago/webhook?data.id=' + encodeURIComponent(query) + '&type=' + type, { method: 'POST', headers: { 'content-type': 'application/json', 'x-request-id': requestId, 'x-signature': signature || `ts=${ts},v1=${hash}` }, body: JSON.stringify({ id: 900, type, data: { id }, ...body }) });
}
async function fixture(t) {
  const store = await createAdminStore(':memory:');t.after(async () => await store.close());
  const plan = await store.repository.plans.get('basico');await store.repository.plans.save('basico', { ...plan, mercadopago_plan_id: 'mp_plan_basic' });
  const subscription = { id: 'sub_abc', collector_id: 42, preapproval_plan_id: 'mp_plan_basic', status: 'pending', next_payment_date: '2026-10-20T10:00:00Z', last_modified: stamp, payer_email: 'test@example.com' };
  const payment = { id: 101, collector_id: 42, status: 'approved', status_detail: 'accredited', transaction_amount: 99, currency_id: 'BRL', date_approved: stamp, date_last_updated: stamp };
  const invoice = { id: 201, preapproval_id: 'sub_abc', payment: { id: 101, status: 'approved' }, status: 'processed', last_modified: stamp, debit_date: stamp };
  const state = { subscription, payment, invoice, search: true, fail: false, calls: [] };
  const fetcher = async (url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer ' + env.MERCADOPAGO_ACCESS_TOKEN);assert.equal(options.method, undefined);assert.equal(options.redirect, 'error');state.calls.push(url);
    if (state.fail) throw Error('secret from provider: ' + env.MERCADOPAGO_ACCESS_TOKEN);
    const path = new URL(url).pathname;
    const resource = path === '/users/me' ? { id: 42 } : path === '/preapproval/sub_abc' ? state.subscription : path === '/v1/payments/101' ? state.payment : path === '/authorized_payments/201' ? state.invoice : path === '/authorized_payments/search' ? { results: state.search ? [state.invoice] : [] } : null;
    return { ok: Boolean(resource), json: async () => structuredClone(resource) };
  };
  const send = (type = 'subscription_preapproval', id = 'sub_abc', options = {}) => handleMercadoPagoWebhook(notification(type, id, options), { env, store, fetcher });
  return { store, state, send, fetcher, report: async () => await store.repository.billing.report() };
}

test('duplicate events and concurrent deliveries do not duplicate subscription/payment/event records', async (t) => {
  const { send, report } = await fixture(t);
  const responses = await Promise.all([send(), send()]);assert(responses.every((r) => r.status === 200));
  assert.equal((await (await send('subscription_preapproval', 'sub_abc', { requestId: 'retry-2', body: { id: 901 } })).json()).duplicate, true);
  assert.equal((await report()).totals.subscriptions, 1);assert.equal((await report()).totals.events, 1);
  await send('payment', 101);await send('payment', 101, { requestId: 'retry-3' });await send('subscription_authorized_payment', 201);
  assert.equal((await report()).totals.payments, 1);assert.equal((await report()).totals.invoices, 1);assert.equal((await report()).totals.events, 3);
});

test('creation, authorization, pause, cancellation and next billing date come from the API', async (t) => {
  const { send, state, report } = await fixture(t);
  for (const [i, status] of ['pending', 'authorized', 'paused', 'cancelled'].entries()) {
    state.subscription.status = status;state.subscription.last_modified = `2026-09-20T1${i}:00:00Z`;state.subscription.next_payment_date = status === 'cancelled' ? null : '2026-10-20T10:00:00Z';
    assert.equal((await send('subscription_preapproval', 'sub_abc', { body: { status: 'forged', data: { id: 'sub_abc', status: 'forged' } } })).status, 200);
    assert.equal((await report()).subscriptions[0].status, status);assert.equal((await report()).subscriptions[0].next_payment_date, status === 'cancelled' ? null : '2026-10-20T10:00:00.000Z');
  }
  state.subscription.status = 'authorized';state.subscription.last_modified = stamp;await send();assert.equal((await report()).subscriptions[0].status, 'cancelled');
});

test('approved payment confirmed from payment API, not invoice/body status', async (t) => {
  const { send, state, report } = await fixture(t);state.invoice.payment.status = 'rejected';
  assert.equal((await send('subscription_authorized_payment', 201, { body: { status: 'rejected' } })).status, 200);
  const saved = (await report()).payments[0];assert.equal(saved.status, 'approved');assert.equal(saved.amount_cents, 9900);assert.equal(saved.id, '101');assert.equal(saved.invoice_id, '201');assert.equal(saved.subscription_id, 'sub_abc');
  assert(state.calls.some((url) => url.endsWith('/v1/payments/101')));
});

test('pending and rejected payments; stale notification cannot regress a newer payment', async (t) => {
  const { send, state, report } = await fixture(t);
  for (const [i, status] of ['pending', 'rejected', 'approved'].entries()) {
    state.payment.status = status;state.payment.date_last_updated = `2026-09-20T1${i}:00:00Z`;state.payment.date_approved = status === 'approved' ? state.payment.date_last_updated : null;
    assert.equal((await send('payment', 101)).status, 200);assert.equal((await report()).payments[0].status, status);
  }
  state.payment.status = 'pending';state.payment.date_last_updated = stamp;await send('payment', 101);
  assert.equal((await report()).payments[0].status, 'approved');assert.equal((await report()).totals.payments, 1);
});

test('payment before invoice is linked later without duplicating it; invoice without payment is not approval', async (t) => {
  const { send, state, report } = await fixture(t);state.search = false;
  await send('payment', 101);assert.equal((await report()).payments[0].subscription_id, null);
  await send('subscription_authorized_payment', 201);assert.equal((await report()).payments[0].subscription_id, 'sub_abc');assert.equal((await report()).totals.payments, 1);
  delete state.invoice.payment;state.invoice.status = 'scheduled';state.invoice.last_modified = '2026-09-21T00:00:00Z';await send('subscription_authorized_payment', 201);
  assert.equal((await report()).totals.payments, 1);assert.equal((await report()).invoices[0].status, 'scheduled');
});

test('invalid signature, mismatched signed ID, malformed input and missing secret fail closed', async (t) => {
  const { store, fetcher, state, send, report } = await fixture(t);
  assert.equal((await send('payment', 101, { secret: 'wrong' })).status, 401);
  assert.equal((await send('payment', 101, { signature: 'ts=123,v1=short' })).status, 401);
  assert.equal((await send('payment', 101, { query: '102' })).status, 400);
  assert.equal((await handleMercadoPagoWebhook(notification('payment', 101), { store, fetcher, env: { ...env, MERCADOPAGO_WEBHOOK_SECRET: '' } })).status, 503);
  const unsigned = new Request(env.ADMIN_SITE_ORIGIN + '/api/mercadopago/webhook', { method: 'POST', body: '{}' });assert.equal((await handleMercadoPagoWebhook(unsigned, { store, fetcher, env })).status, 401);
  assert.equal(state.calls.length, 0);assert.equal((await report()).totals.events, 0);
});

test('provider failure is retryable and sanitized; wrong collector rejected; unknown plan ignored', async (t) => {
  const { send, state, report, store } = await fixture(t);const originalPlans = await store.repository.plans.list();state.fail = true;
  const failed = await send();assert.equal(failed.status, 503);assert(!(await failed.text()).includes(env.MERCADOPAGO_ACCESS_TOKEN));assert.equal((await report()).totals.events, 0);
  state.fail = false;state.subscription.collector_id = 43;assert.equal((await send()).status, 403);
  state.subscription.collector_id = 42;state.subscription.preapproval_plan_id = 'other-plan';assert.equal((await (await send()).json()).ignored, true);assert.equal((await report()).totals.subscriptions, 0);
  state.subscription.preapproval_plan_id = 'mp_plan_basic';assert.equal((await send()).status, 200);
  assert.deepEqual(await store.repository.plans.list(), originalPlans);
});

test('public webhook uses signed headers, accepts lowercase-normalized IDs and delayed retries without admin session', async (t) => {
  const { send, report } = await fixture(t);assert.equal((await send('subscription_preapproval', 'SUB_ABC', { ts: '1704908010' })).status, 200);assert.equal((await report()).totals.subscriptions, 1);
});

test('admin history is restricted to OWNER/ADMIN, paginated, and never reveals credentials', async (t) => {
  const { store, send, fetcher } = await fixture(t);await send();await send('payment', 101);
  await store.createOwner('owner@example.com', 'test-password-123');const owner = await store.authenticate('owner@example.com', 'test-password-123'),token = await store.createSession(owner.id);
  const path = ['configuracoes', 'pagamentos', 'historico'];const req = new NextRequest(env.ADMIN_SITE_ORIGIN + '/api/admin/' + path.join('/'), { headers: { cookie: cookieName(env) + '=' + token } });
  const result = await handleAdminApi(req, path, { store, env, fetcher });assert.equal(result.status, 200);const data = await result.json();assert.equal(data.subscriptions.length, 1);assert.equal(data.payments.length, 1);assert(data.webhook.configured);assert.equal(data.webhook.url, env.ADMIN_SITE_ORIGIN + '/api/mercadopago/webhook');
  assert(!JSON.stringify(data).includes(env.MERCADOPAGO_ACCESS_TOKEN));assert(!JSON.stringify(data).includes(env.MERCADOPAGO_WEBHOOK_SECRET));
  assert.equal((await handleAdminApi(req, path, { env, store: { ...store, getSession: () => ({ ...owner, role: 'VIEWER' }) } })).status, 403);
  assert.equal((await handleAdminApi(new NextRequest(req.url), path, { env, store })).status, 401);
  assert.equal(webhookConfiguration({ ...env, MERCADOPAGO_WEBHOOK_SECRET: '' }).configured, false);
});
