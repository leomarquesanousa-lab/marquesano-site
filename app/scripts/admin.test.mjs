import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server.js';
import { createAdminStore, hashPassword, verifyPassword, canAccess, cookieName, cookieOptions, configured } from '../server/admin/core.mjs';
import { handleAdminApi } from '../server/admin/api.mjs';

const email = 'owner@example.com', password = 'test-password-only-123';
const env = { NODE_ENV: 'production', ADMIN_SITE_ORIGIN: 'https://marquesano.com.br', ADMIN_DATABASE_PATH: process.cwd() + '/.admin-data/test.sqlite' };
const request = (action, { method = 'POST', origin = env.ADMIN_SITE_ORIGIN, body, token } = {}) => new NextRequest(`https://marquesano.com.br/api/admin/${action}`, { method, headers: { Origin: origin, 'Content-Type': 'application/json', ...(token ? { Cookie: `${cookieName(env)}=${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });

test('password hashing uses salt, rejects plaintext, wrong and oversized passwords', async () => {
  const hash = await hashPassword(password);
  assert(!hash.includes(password)); assert.notEqual(hash, await hashPassword(password));
  assert(await verifyPassword(password, hash)); assert(!await verifyPassword('wrong', hash));
  assert(!await verifyPassword('x'.repeat(257), hash));
  await assert.rejects(hashPassword('short'));
});
test('bootstrap, session expiry, revocation and persistent account checks', async () => {
  let time = 1000; const store = createAdminStore(':memory:', () => time);
  try {
    await store.createOwner(email, password);
    await assert.rejects(store.createOwner('other@example.com', password));
    const user = await store.authenticate(email, password); assert.equal(user.role, 'OWNER');
    assert.equal(await store.authenticate(email, 'wrong'), null);
    const token = store.createSession(user.id); assert.equal(store.getSession(token).id, user.id);
    assert.equal(store.getSession(token.slice(1)), null);
    store.revokeSession(token); assert.equal(store.getSession(token), null);
    const expired = store.createSession(user.id); time += 28800001; assert.equal(store.getSession(expired), null);
  } finally { store.close(); }
});
test('role matrix denies unknown roles and modules', () => {
  for (const module of ['dashboard','marketing','analytics','leads','clientes','seo','configuracoes']) assert(canAccess('OWNER', module));
  assert(canAccess('MARKETING', 'seo')); assert(!canAccess('MARKETING', 'clientes'));
  assert(canAccess('SALES', 'leads')); assert(!canAccess('SALES', 'configuracoes'));
  assert(canAccess('VIEWER', 'analytics')); assert(!canAccess('VIEWER', 'marketing'));
  assert(!canAccess('OWNER', 'constructor')); assert(!canAccess('UNKNOWN', 'dashboard'));
});
test('persistent limiter enforces account and global limits and recovers after window', () => {
  let time = 1000; const store = createAdminStore(':memory:', () => time);
  try {
    for (let i = 0; i < 5; i++) assert(store.consumeLogin(email));
    assert(!store.consumeLogin(email));
    for (let i = 0; i < 95; i++) assert(store.consumeLogin(`other${i}`));
    assert(!store.consumeLogin('new')); time += 900001; assert(store.consumeLogin(email));
  } finally { store.close(); }
});
test('API validates CSRF, authentication, secure cookies, logout and fails closed', async () => {
  const store = createAdminStore(':memory:'); const deps = { store, env };
  try {
    await store.createOwner(email, password);
    assert.equal((await handleAdminApi(request('session', { method: 'GET' }), ['session'], deps)).status, 401);
    assert.equal((await handleAdminApi(request('login', { origin: 'https://evil.example', body: { email, password } }), ['login'], deps)).status, 403);
    assert.equal((await handleAdminApi(request('login', { body: { email, password: 'wrong' } }), ['login'], deps)).status, 401);
    const response = await handleAdminApi(request('login', { body: { email, password } }), ['login'], deps);
    assert.equal(response.status, 200);
    const cookie = response.headers.get('set-cookie');
    for (const flag of ['HttpOnly', 'Secure', 'SameSite=strict', 'Path=/']) assert(cookie.includes(flag));
    const token = response.cookies.get(cookieName(env)).value;
    assert.equal((await handleAdminApi(request('configuracoes', { method: 'GET', token }), ['configuracoes'], deps)).status, 200);
    assert.equal((await handleAdminApi(request('unknown', { method: 'GET', token }), ['unknown'], deps)).status, 403);
    assert.equal((await handleAdminApi(request('logout', { token }), ['logout'], deps)).status, 200);
    assert.equal((await handleAdminApi(request('session', { method: 'GET', token }), ['session'], deps)).status, 401);
    assert.equal((await handleAdminApi(request('login'), ['login'], { ...deps, env: {} })).status, 503);
    assert.equal(cookieOptions(env).secure, true); assert(configured(env));
    assert(!configured({ ...env, ADMIN_SITE_ORIGIN: 'http://marquesano.com.br' }));
  } finally { store.close(); }
});
