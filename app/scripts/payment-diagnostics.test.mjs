import test from 'node:test';
import assert from 'node:assert/strict';
import { mpRequest } from '../server/admin/mercadopago.mjs';
const env = { MERCADOPAGO_SITE_ORIGIN: 'https://marquesano.com.br', ADMIN_SITE_ORIGIN: 'https://marquesano.com.br', MERCADOPAGO_ACCESS_TOKEN: 'private-access-token', DATABASE_URL: 'postgresql://private-secret/db' };
test('preapproval logs provider errors with redaction and keeps client response friendly', async () => {
  const original = console.info, logs = [];
  console.info = (...args) => logs.push(args);
  try {
    await assert.rejects(mpRequest('/preapproval', { env, method: 'POST', body: { card_token_id: 'private-card-token', payer_email: 'payer@example.test' },
      fetcher: async () => Response.json({ error: 'bad_request', message: 'Invalid card token private-card-token private-access-token 4111 1111 1111 1111 CVV 123 postgresql://private-secret/db',
        cause: [{ code: 'invalid_card_token', description: 'Token expired', card_number: '4111111111111111' }] }, { status: 400, headers: { 'x-request-id': 'request-test-id' } })
    }), error => error.status === 502 && error.definiteRejection && !error.message.includes('private'));
    const text = JSON.stringify(logs);
    for (const secret of ['private-card-token', 'private-access-token', '4111', '123', 'postgresql://', 'payer@example.test']) assert(!text.includes(secret));
    assert.equal(logs[0][1].http_status, 400);
    assert.equal(logs[0][1].cause[0].code, 'invalid_card_token');
    assert.equal(logs[0][1].request_id, 'request-test-id');
  } finally { console.info = original; }
});
test('authorized response is preserved and logged without token or payer', async () => {
  const original = console.info, logs = [];
  console.info = (...args) => logs.push(args);
  try {
    const result = await mpRequest('/preapproval', { env, method: 'POST', body: { status: 'authorized' }, fetcher: async () => Response.json({ id: 'subscription-test', status: 'authorized', payer_email: 'payer@example.test' }, { status: 201 }) });
    assert.equal(result.id, 'subscription-test');
    assert.equal(logs[0][1].status, 'authorized');
    assert.equal(logs[0][1].http_status, 201);
    assert(!JSON.stringify(logs).includes('payer@example.test'));
  } finally { console.info = original; }
});
