import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { testStore } from './postgres-test-store.mjs';
import { cardCheckout, attemptKey } from '../server/admin/card-checkout.mjs';

const env = { MERCADOPAGO_SITE_ORIGIN: 'https://marquesano.com.br', ADMIN_SITE_ORIGIN: 'https://marquesano.com.br', MERCADOPAGO_ACCESS_TOKEN: 'mock-access', MERCADOPAGO_PUBLIC_KEY: 'mock-public' };
const request = (body, origin = env.ADMIN_SITE_ORIGIN) => new Request(origin + '/api/checkout/basico', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
async function fixture(t) {
  const { store, db } = await testStore();
  t.after(() => store.close());
  const repository = store.repository;
  const rows = [];
  for (const [index, id] of ['basico','intermediario','professional'].entries()) {
    await repository.plans.save(id, { ...(await repository.plans.get(id)), monthly_price_cents: 9900 + index * 10000, cycles: 12, active: true });
    rows.push(await repository.plans.finish(await repository.plans.start(id), 'provider_plan_' + index));
  }
  const calls = [], resources = [];
  const options = { env, fetcher: async (url, init) => {
    calls.push({ url, ...init });
    const plan = rows.find(p => url.endsWith('/preapproval_plan/' + p.mercadopago_plan_id));
    if (plan) return { ok: true, json: async () => ({ id: plan.mercadopago_plan_id, status: 'active', auto_recurring: { frequency: 1, frequency_type: 'months', repetitions: 12, currency_id: 'BRL', transaction_amount: plan.monthly_price_cents / 100 } }) };
    if (init.method === 'POST') {
      const body = JSON.parse(init.body);
      const remote = { ...body, id: 'subscription_' + resources.length, next_payment_date: '2026-10-20T00:00:00Z', last_modified: '2026-09-20T00:00:00Z' };
      delete remote.card_token_id;
      resources.push(remote);
      return { ok: true, json: async () => remote };
    }
    if (url.includes('/search?')) return { ok: true, json: async () => ({ results: resources }) };
    return { ok: true, json: async () => resources.find(r => url.endsWith('/' + r.id)) };
  } };
  const body = (index = 0) => ({ revision: rows[index].revision, payer_email: 'buyer@example.test', card_token_id: 'official_card_token_test', terms: true, request_id: randomBytes(32).toString('hex') });
  return { repository, db, rows, calls, resources, options, body };
}

test('local HTTP checkout reaches POST preapproval with independent HTTPS public callback', async t => {
  const f = await fixture(t);
  const options = { ...f.options, env: { ...env, NODE_ENV: 'development', ADMIN_SITE_ORIGIN: 'http://localhost:3000' } };
  const result = await cardCheckout(request(f.body(), 'http://localhost:3000'), 'basico', f.repository, options);
  assert.equal(result.url, '/checkout/sucesso');
  const post = f.calls.find(call => call.method === 'POST');
  assert.equal(post.url, 'https://api.mercadopago.com/preapproval');
  assert.equal(JSON.parse(post.body).back_url, 'https://marquesano.com.br/checkout/sucesso');
});

test('Básico, Professional and Business authorize exactly their stored provider plans and persist subscriptions', async t => {
  const f = await fixture(t);
  for (const [i, code] of ['basico','professional','business'].entries()) {
    const data = f.body(i);
    const result = await cardCheckout(request(data), code, f.repository, f.options);
    assert.equal(result.url, '/checkout/sucesso');
    const sent = JSON.parse(f.calls.at(-1).body);
    assert.equal(sent.preapproval_plan_id, f.rows[i].mercadopago_plan_id);
    assert.equal(sent.status, 'authorized');
    assert.equal(sent.card_token_id, data.card_token_id);
    assert.equal(sent.external_reference, attemptKey(data.request_id));
    assert.equal(sent.transaction_amount, undefined);
    const record = await f.repository.checkout.get(attemptKey(data.request_id));
    assert.equal(record.amount_cents, f.rows[i].monthly_price_cents);
    assert.equal(record.state, 'authorized');
    assert.equal(JSON.stringify(record).includes(data.card_token_id), false);
  }
  const report = await f.repository.billing.report();
  assert.equal(report.totals.subscriptions, 3);
  assert.equal(report.totals.payments, 0); // Authorization is not a fabricated payment.
  assert.deepEqual(report.subscriptions.map(s => s.status), ['authorized','authorized','authorized']);
});

test('unknown plan, inactive, unsynchronized, wrong duration, missing token and consent are rejected', async t => {
  const f = await fixture(t);
  await assert.rejects(cardCheckout(request(f.body()), 'unknown', f.repository, f.options), /Plano não encontrado/);
  await assert.rejects(cardCheckout(request({ ...f.body(), card_token_id: undefined }), 'basico', f.repository, f.options), /cartão válido/);
  await assert.rejects(cardCheckout(request({ ...f.body(), terms: false }), 'basico', f.repository, f.options), /Termos/);
  for (const changes of [{ active: false }, { active: true }, { cycles: 6 }]) {
    await f.repository.plans.save('basico', { ...(await f.repository.plans.get('basico')), ...changes });
    await assert.rejects(cardCheckout(request(f.body()), 'basico', f.repository, f.options), /temporariamente indisponível/);
  }
  assert.equal(f.calls.length, 0);
});

test('browser cannot manipulate price, frequency, provider plan, stale revision or origin', async t => {
  const f = await fixture(t);
  for (const extra of [{ price: 1 }, { transaction_amount: 1 }, { cycles: 1 }, { preapproval_plan_id: 'other' }]) {
    await assert.rejects(cardCheckout(request({ ...f.body(), ...extra }), 'basico', f.repository, f.options), /Confira/);
  }
  await assert.rejects(cardCheckout(request({ ...f.body(), revision: 99 }), 'basico', f.repository, f.options), /mudaram/);
  await assert.rejects(cardCheckout(request(f.body(), 'https://evil.test'), 'basico', f.repository, f.options), /Origem/);
  assert.equal(f.calls.length, 0);
});

test('CC_VAL_433 returns only the requested friendly message and records rejection', async t => {
  const f = await fixture(t), data = f.body();
  const fetcher = async (url, init) => init.method === 'POST'
    ? Response.json({ code: 'rejected', message: 'CC_VAL_433 Credit card validation has failed' }, { status: 400 })
    : f.options.fetcher(url, init);
  await assert.rejects(cardCheckout(request(data), 'basico', f.repository, { ...f.options, fetcher }), e =>
    e.status === 422 && e.message === 'O Mercado Pago não conseguiu validar este cartão. Confira os dados informados ou tente outro cartão.');
  assert.equal((await f.repository.checkout.get(attemptKey(data.request_id))).state, 'rejected');
});

test('provider rejection is sanitized and allows retry with a new token/attempt', async t => {
  const f = await fixture(t), data = f.body();
  const fetcher = async (url, init) => init.method === 'POST' ? { ok: false, status: 400, json: async () => ({ message: 'secret' }) } : f.options.fetcher(url, init);
  await assert.rejects(cardCheckout(request(data), 'basico', f.repository, { env, fetcher }), e => e.status === 422 && !e.message.includes('secret'));
  assert.equal((await f.repository.checkout.get(attemptKey(data.request_id))).state, 'rejected');
  assert.equal((await cardCheckout(request(f.body()), 'basico', f.repository, f.options)).url, '/checkout/sucesso');
});

test('duplicate submissions and new attempt IDs cannot create a second subscription', async t => {
  const f = await fixture(t), data = f.body();
  await cardCheckout(request(data), 'basico', f.repository, f.options);
  await cardCheckout(request(data), 'basico', f.repository, f.options);
  await assert.rejects(cardCheckout(request(f.body()), 'basico', f.repository, f.options), /Já existe/);
  assert.equal(f.calls.filter(c => c.method === 'POST').length, 1);
});

test('timeout after provider acceptance reconciles without another POST, even without a new token', async t => {
  const f = await fixture(t), data = f.body();
  const fetcher = async (url, init) => {
    const response = await f.options.fetcher(url, init);
    if (init.method === 'POST') throw Error('network timeout with private data');
    return response;
  };
  await assert.rejects(cardCheckout(request(data), 'basico', f.repository, { env, fetcher }), e => e.status === 202);
  const result = await cardCheckout(request({ ...data, card_token_id: undefined }), 'basico', f.repository, f.options);
  assert.equal(result.url, '/checkout/sucesso');
  assert.equal(f.calls.filter(c => c.method === 'POST').length, 1);
  const search = new URL(f.calls.find(c => c.url.includes('/search?')).url);
  assert.equal(search.searchParams.get('payer_email'), data.payer_email);
  assert.equal(search.searchParams.get('preapproval_plan_id'), f.rows[0].mercadopago_plan_id);
});

test('unconfirmed provider status never produces a success receipt or another subscription', async t => {
  const f = await fixture(t), data = f.body();
  const fetcher = async (url, init) => {
    const response = await f.options.fetcher(url, init);
    if (init.method === 'POST') f.resources[0].status = 'pending';
    return response;
  };
  await assert.rejects(cardCheckout(request(data), 'basico', f.repository, { env, fetcher }), e => e.status === 202);
  await assert.rejects(cardCheckout(request(data), 'basico', f.repository, { env, fetcher }), e => e.status === 202);
  assert.equal(f.calls.filter(c => c.method === 'POST').length, 1);
  assert.equal((await f.repository.billing.report()).totals.subscriptions, 0);
});

test('concurrent submissions reserve only one creation, and remote price drift prevents POST', async t => {
  const f = await fixture(t), data = f.body();
  const results = await Promise.allSettled([
    cardCheckout(request(data), 'basico', f.repository, f.options),
    cardCheckout(request(data), 'basico', f.repository, f.options),
  ]);
  assert.ok(results.some(result => result.status === 'fulfilled'));
  assert.equal(f.calls.filter(c => c.method === 'POST').length, 1);
  const fetcher = async (url, init) => {
    const response = await f.options.fetcher(url, init);
    const remote = await response.json();
    remote.auto_recurring.transaction_amount = 1;
    return { ok: true, json: async () => remote };
  };
  await assert.rejects(cardCheckout(request(f.body(1)), 'professional', f.repository, { env, fetcher }), /temporariamente indisponível/);
  assert.equal(f.calls.filter(c => c.method === 'POST').length, 1);
});

test('explicit local development origin reaches catalog validation; production rejects localhost', async t => {
  const f = await fixture(t);
  await f.repository.plans.save('basico', { ...(await f.repository.plans.get('basico')), active: false });
  const local = () => request(f.body(), 'http://localhost:3000');
  await assert.rejects(cardCheckout(local(), 'basico', f.repository, { ...f.options, env: { ...env, NODE_ENV: 'development', ADMIN_SITE_ORIGIN: 'http://localhost:3000' } }), e => e.status === 409 && e.message.includes('temporariamente indisponível'));
  await assert.rejects(cardCheckout(local(), 'basico', f.repository, { ...f.options, env: { ...env, NODE_ENV: 'production' } }), e => e.status === 403);
  assert.equal(f.calls.length, 0);
});
