import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdminStore } from '../server/admin/core.mjs';
import { directCheckout } from '../server/admin/direct-checkout.mjs';

const env = { ADMIN_SITE_ORIGIN: 'https://marquesano.com.br', MERCADOPAGO_ACCESS_TOKEN: 'mock-token' };
const request = (body, origin = env.ADMIN_SITE_ORIGIN) => new Request(origin + '/api/checkout/basico', {
  method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
function fixture(t) {
  const store = createAdminStore(':memory:');
  t.after(() => store.close());
  const plans = store.repository.plans;
  const rows = ['basico', 'intermediario', 'professional'].map((id, i) => {
    plans.save(id, { ...plans.get(id), monthly_price_cents: 10000 + i * 1000, cycles: 6 + i, active: true });
    return plans.finish(plans.start(id), 'provider_plan_' + i);
  });
  const calls = [];
  const fetcher = async url => {
    calls.push(url);
    const p = rows.find(row => url.endsWith('/' + row.mercadopago_plan_id));
    assert.ok(p);
    return { ok: true, json: async () => ({ id: p.mercadopago_plan_id, status: 'active',
      auto_recurring: { frequency: 1, frequency_type: 'months', currency_id: 'BRL', transaction_amount: p.monthly_price_cents / 100, repetitions: p.cycles },
      init_point: 'https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=' + p.mercadopago_plan_id }) };
  };
  return { plans, rows, calls, options: { env, fetcher } };
}

test('canonical codes select only their existing provider plan, without migrating IDs', async t => {
  const { plans, rows, calls, options } = fixture(t);
  for (const [i, code] of ['basico', 'professional', 'business'].entries()) {
    const result = await directCheckout(request({ revision: rows[i].revision }), code, plans, options);
    assert.equal(new URL(result.url).searchParams.get('preapproval_plan_id'), rows[i].mercadopago_plan_id);
    assert.equal(calls.length, i + 1);
    assert.ok(calls[i].endsWith('/' + rows[i].mercadopago_plan_id));
  }
});

test('browser cannot override price, cycles or provider ID; legacy and unknown codes rejected', async t => {
  const { plans, rows, calls, options } = fixture(t);
  for (const extra of [{ monthly_price_cents: 1 }, { price: 1 }, { cycles: 1 }, { mercadopago_plan_id: 'other' }]) {
    await assert.rejects(directCheckout(request({ revision: rows[0].revision, ...extra }), 'basico', plans, options), /inválidos/);
  }
  for (const code of ['intermediario', 'unknown', '__proto__']) {
    await assert.rejects(directCheckout(request({ revision: 2 }), code, plans, options), /não encontrado/);
  }
  await assert.rejects(directCheckout(request({ revision: 2 }, 'https://evil.example'), 'basico', plans, options), /Origem/);
  assert.equal(calls.length, 0);
});

test('inactive or unsynced plans display required message without contacting provider', async t => {
  const { plans, rows, calls, options } = fixture(t);
  for (const changes of [{ active: false }, { active: true }]) {
    const p = plans.save('basico', { ...plans.get('basico'), ...changes });
    await assert.rejects(directCheckout(request({ revision: p.revision }), 'basico', plans, options), /Plano temporariamente indisponível/);
  }
  assert.equal(calls.length, 0);
});

test('API failure is sanitized and stale displayed revision is rejected', async t => {
  const { plans, rows, options } = fixture(t);
  await assert.rejects(directCheckout(request({ revision: 999 }), 'basico', plans, options), /mudaram/);
  await assert.rejects(directCheckout(request({ revision: rows[0].revision }), 'basico', plans, {
    env, fetcher: async () => { throw Error('private-secret'); },
  }), error => error.message.includes('Não foi possível iniciar') && !error.message.includes('private-secret'));
});
