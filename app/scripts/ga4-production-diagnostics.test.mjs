import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { googleReport } from '../server/admin/google.mjs';

test('production diagnostic reports success, missing configuration and safe errors without credentials', async () => {
  const logs = [], info = console.info, error = console.error;
  console.info = console.error = value => logs.push(value);
  const env = { NODE_ENV: 'production', GOOGLE_CLIENT_EMAIL: 'private@example.invalid', GOOGLE_PRIVATE_KEY: generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } }).privateKey };
  try {
    const result = await googleReport('ga4', { GA4_PROPERTY_ID: '123' }, { start: '30daysAgo', end: 'yesterday' }, { env, trace: 'test', fetcher: async url => url.includes('oauth2') ? Response.json({ access_token: 'secret-token' }) : Response.json({ rows: [{ metricValues: [{ value: '22' }] }], rowCount: 1 }) });
    assert.equal(result.status, 'Ativo');
    assert(logs.includes('GA4_REQUEST_STARTED'));
    assert(logs.includes('GA4_HTTP_STATUS=200'));
    assert(logs.includes('GA4_ROWS=1'));
    await googleReport('ga4', {}, {}, { env, trace: 'test' });
    assert(logs.includes('GA4_ERROR_NAME=ConfigurationError'));
    await googleReport('ga4', { GA4_PROPERTY_ID: '123' }, {}, { env, trace: 'test', fetcher: async () => Response.json({ error: { message: env.GOOGLE_PRIVATE_KEY } }, { status: 403 }) });
    assert(logs.includes('GA4_HTTP_STATUS=403'));
    assert(logs.some(value => value.startsWith('GA4_ERROR_MESSAGE=')));
    for (const secret of [env.GOOGLE_CLIENT_EMAIL, env.GOOGLE_PRIVATE_KEY, 'secret-token']) assert(!logs.join('\n').includes(secret));
  } finally { console.info = info; console.error = error; }
});
