import test from 'node:test';
import assert from 'node:assert/strict';
import { homologation, localOnly, testCatalog } from '../server/admin/mp-homologation.mjs';
const env = { NODE_ENV: 'development', MERCADOPAGO_TEST_PUBLIC_KEY: 'test-public', MERCADOPAGO_TEST_ACCESS_TOKEN: 'test-access', MERCADOPAGO_TEST_BUYER_EMAIL: 'test@testuser.com', MERCADOPAGO_TEST_PLAN_ID: 'test-plan', MERCADOPAGO_ACCESS_TOKEN: 'never-production' };
const request = () => new Request('http://localhost:3000/api/mp-homologacao', { method: 'POST', headers: { host: 'localhost:3000', origin: 'http://localhost:3000', 'content-type': 'application/json' }, body: JSON.stringify({ terms: true, request_id: 'a'.repeat(64), card_token_id: 'test-card-token-12345', payer_email: 'untrusted@invalid.test' }) });
test('production and remote hosts are blocked', async () => {
  assert.throws(() => localOnly('localhost:3000', { NODE_ENV: 'production' }));
  assert.throws(() => localOnly('marquesano.com.br', env));
  await assert.rejects(homologation(request(), { ...env, NODE_ENV: 'production' }), e => e.status === 404);
});
test('test credentials only, server payer/plan, safe results and no repeated POST', async () => {
  let posts = 0;
  const fetcher = async (url, init) => {
    assert.equal(init.headers.Authorization, 'Bearer test-access');
    if (url.endsWith('/users/me')) return Response.json({ id: 3631388128, tags: ['test_user'] });
    if (url.includes('/preapproval_plan/')) return Response.json({ collector_id: 3631388128, status: 'active', auto_recurring: { frequency: 1, frequency_type: 'months', repetitions: 12, currency_id: 'BRL', transaction_amount: 5 } });
    posts++;
    const body = JSON.parse(init.body);
    assert.equal(body.payer_email, env.MERCADOPAGO_TEST_BUYER_EMAIL);
    assert.equal(body.preapproval_plan_id, env.MERCADOPAGO_TEST_PLAN_ID);
    return Response.json({ id: 'subscription-test', status: 'authorized' }, { status: 201, headers: { 'x-request-id': 'safe-request' } });
  };
  const a = await homologation(request(), env, fetcher);
  assert.equal(a.authorized, true);
  assert.equal(a.http_status, 201);
  await homologation(request(), env, fetcher);
  assert.equal(posts, 1);
  for (const secret of Object.values(env)) assert(!JSON.stringify(a).includes(secret));
});
test('a real seller cannot activate the test form', async () => {
  await assert.rejects(testCatalog(env, async () => Response.json({ id: 123, tags: [] })), e => e.status === 403);
});
