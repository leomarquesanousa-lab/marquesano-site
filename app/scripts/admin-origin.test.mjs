import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server.js';
import { adminOrigin, validAdminRequestOrigin } from '../server/admin/origin.mjs';
import { handleAdminApi } from '../server/admin/api.mjs';

const env = { NODE_ENV: 'production', ADMIN_SITE_ORIGIN: 'https://marquesano.com.br/', DATABASE_URL: 'postgresql://isolated/test' };
const request = (origin, headers = {}) => new NextRequest('http://internal:3000/api/admin/login', {
  method: 'POST', headers: { origin, host: 'internal:3000', 'x-forwarded-host': 'marquesano.com.br', 'x-forwarded-proto': 'https', 'content-type': 'application/json', ...headers }, body: '{}'
});
test('configured origin is normalized', () => {
  assert.equal(adminOrigin(env), 'https://marquesano.com.br');
});
for (const origin of ['https://marquesano.com.br', 'https://www.marquesano.com.br']) {
  test(`${origin} passes actual API origin guard behind HTTPS proxy`, async () => {
    assert(validAdminRequestOrigin(request(origin), env));
    const result = await handleAdminApi(request(origin), ['login'], { env, store: {} });
    assert.equal(result.status, 401); // Empty credentials, after the origin check; no database writes.
  });
}
for (const origin of ['https://external.example', 'http://marquesano.com.br', 'http://www.marquesano.com.br', 'https://marquesano.com.br.evil.example', 'null', 'https://marquesano.com.br:444']) {
  test(`rejects ${origin}`, async () => {
    assert.equal((await handleAdminApi(request(origin), ['login'], { env, store: {} })).status, 403);
  });
}
test('valid Origin takes precedence over reverse proxy headers', () => {
  const origin = 'https://marquesano.com.br';
  for (const headers of [
    { 'x-forwarded-host': 'external.example' },
    { 'x-forwarded-host': 'marquesano.com.br, external.example' },
    { 'x-forwarded-proto': 'http' },
    { 'x-forwarded-proto': 'https,http' }
  ]) assert.equal(validAdminRequestOrigin(request(origin, headers), env), true);
  assert(validAdminRequestOrigin(request(origin, { 'x-forwarded-host': 'www.marquesano.com.br' }), env));
});
test('direct HTTPS host works, missing Origin fails, local dev stays explicit', () => {
  const req = new NextRequest('https://marquesano.com.br/api/admin/login', { headers: { host: 'marquesano.com.br', origin: 'https://www.marquesano.com.br' } });
  assert(validAdminRequestOrigin(req, env));
  req.headers.delete('origin');
  assert.equal(validAdminRequestOrigin(req, env), false);
  const local = new NextRequest('http://localhost:3000/api/admin/login', { headers: { origin: 'http://localhost:3000' } });
  assert(validAdminRequestOrigin(local, { NODE_ENV: 'development', ADMIN_SITE_ORIGIN: 'http://localhost:3000/' }));
  assert.equal(validAdminRequestOrigin(local, env), false);
});

test('absent Origin uses first proxy values with independent CSRF evidence', () => {
  const make = extra => new NextRequest('http://internal/api/checkout/basico', { headers: {
    host: 'internal', 'x-forwarded-host': 'marquesano.com.br, internal',
    'x-forwarded-proto': 'https, http', referer: 'https://marquesano.com.br/checkout/basico', ...extra
  } });
  assert(validAdminRequestOrigin(make({}), env));
  assert(!validAdminRequestOrigin(make({ 'x-forwarded-host': 'evil.com, marquesano.com.br' }), env));
  assert(!validAdminRequestOrigin(make({ 'x-forwarded-proto': 'http, https' }), env));
  assert(!validAdminRequestOrigin(make({ referer: 'https://evil.com/' }), env));
  assert(!validAdminRequestOrigin(make({ origin: 'https://evil.com' }), env));
  assert(!validAdminRequestOrigin(make({ origin: '' }), env));
  const req = make({}); req.headers.delete('referer');
  assert(!validAdminRequestOrigin(req, env));
  req.headers.set('sec-fetch-site', 'same-origin');
  assert(validAdminRequestOrigin(req, env));
});
