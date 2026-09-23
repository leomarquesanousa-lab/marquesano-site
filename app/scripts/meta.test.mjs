import { createTestAdminStore as createAdminStore } from './postgres-test-store.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server.js';
import { cookieName, cookieOptions } from '../server/admin/core.mjs';
import { handleAdminApi } from '../server/admin/api.mjs';
import { metaCookieName } from '../server/admin/meta-api.mjs';
import { META_SCOPES, metaConfig, metaStatus, metaAccess, createMetaClient, encryptToken } from '../server/admin/meta.mjs';
import { testStore } from './postgres-test-store.mjs';
import { migrate } from '../server/admin/migrations.mjs';
import { createRepository } from '../server/admin/repository.mjs';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { canAccess } from '../server/admin/core.mjs';

const env = { NODE_ENV: 'production', ADMIN_SITE_ORIGIN: 'https://marquesano.com.br', DATABASE_URL: 'postgresql://isolated/test', META_APP_ID: '123', META_APP_SECRET: 'test-only-app-secret', META_REDIRECT_URI: 'https://marquesano.com.br/api/admin/meta/callback' };
const token = 'private-meta-access-token',profile = { id: '456', name: 'Pessoa de teste' },account = { id: 'act_789', name: 'Conta de teste', account_status: 1, currency: 'BRL', timezone_name: 'America/Sao_Paulo', business: { id: '999', name: 'Negócio de teste' } };
function request(path, { method = 'GET', session, browser, origin = env.ADMIN_SITE_ORIGIN, body, extraHeaders = {} } = {}) {
  return new NextRequest(env.ADMIN_SITE_ORIGIN + '/api/admin/meta/' + path, { method, headers: { Origin: origin, 'Content-Type': 'application/json', Cookie: [session && `${cookieName(env)}=${session}`, browser && `${metaCookieName(env)}=${browser}`].filter(Boolean).join('; '), ...extraHeaders }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
function fixtureFetcher(calls = []) {return async (url, options) => {
    calls.push({ url, options });const u = new URL(url);
    assert.equal(u.origin, 'https://graph.facebook.com');assert(!u.searchParams.has('access_token'));assert(!u.searchParams.has('client_secret'));
    if (u.pathname.endsWith('/oauth/access_token')) {assert.equal(options.method, 'POST');assert.equal(options.body.get('client_secret'), env.META_APP_SECRET);return Response.json({ access_token: token, expires_in: 3600 });}
    assert.equal(options.headers.Authorization, 'Bearer ' + token);assert(u.searchParams.has('appsecret_proof'));assert.equal(options.redirect, 'error');
    if (u.pathname.endsWith('/me/permissions')) return Response.json({ data: [{ permission: 'ads_read', status: 'granted' }] });
    if (u.pathname.endsWith('/me/adaccounts')) return Response.json({ data: [account] });
    if (u.pathname.endsWith('/me')) return Response.json(profile);
    if (u.pathname.endsWith('/campaigns')) return Response.json({ data: [{ id: '101', name: 'Campanha real de teste', effective_status: 'ACTIVE', daily_budget: '5000' }] });
    if (u.pathname.endsWith('/insights')) return Response.json({ data: [{ campaign_id: '101', spend: '25.50', impressions: '1000', reach: '750', clicks: '20', cpc: '1.275', cpm: '25.5', ctr: '2' }] });
    if (u.pathname.endsWith('/act_789')) return Response.json({ id: 'act_789' });
    throw Error('Unexpected Meta endpoint');
  };}
async function setup() {let time = Date.now();const store = await createAdminStore(':memory:', () => time);await store.createOwner('owner@example.com', 'test-meta-password-123');const user = await store.authenticate('owner@example.com', 'test-meta-password-123'),session = await store.createSession(user.id),calls = [];return { store, user, session, calls, env, fetcher: fixtureFetcher(calls), advance: (ms) => {time += ms;} };}
const api = (context, path, options) => handleAdminApi(request(path, { session: context.session, ...options }), ['meta', path.split('?')[0]], context);
async function start(context) {const response = await api(context, 'connect');assert.equal(response.status, 303);const location = new URL(response.headers.get('location'));return { state: location.searchParams.get('state'), browser: response.cookies.get(metaCookieName(env)).value, response, location };}
async function callback(context, flow, options = {}) {return api(context, `callback?state=${flow.state}&code=private-code`, { browser: flow.browser, session: undefined, ...options });}

test('OAuth real flow uses minimal scopes, Strict session bridge, encrypted storage, safe accounts and real campaigns', async () => {
  const c = await setup();try {
    const flow = await start(c);assert.equal(flow.location.origin, 'https://www.facebook.com');assert.equal(flow.location.searchParams.get('scope'), 'ads_read');assert.deepEqual(META_SCOPES, ['ads_read']);
    assert.equal(cookieOptions(env).sameSite, 'strict');assert(flow.response.headers.get('set-cookie').includes('SameSite=lax'));assert(flow.response.headers.get('set-cookie').includes('HttpOnly'));
    const callbackResponse = await callback(c, flow);assert.equal(callbackResponse.status, 200);const html = await callbackResponse.text();assert(html.includes('CONNECTED'));assert(html.includes('/admin/configuracoes?meta='));assert(!html.includes(token));assert(!html.includes('private-code'));assert(!html.includes(env.META_APP_SECRET));
    const row = await c.store.repository.meta.get();assert(row.token_ciphertext.startsWith('v1.'));assert(!row.token_ciphertext.includes(token));assert(!JSON.stringify(row).includes(token));assert.equal((await metaStatus(env, c.store.repository.meta)).accountConnected, true);
    const accounts = await (await api(c, 'ad-accounts')).json();assert.deepEqual(Object.keys(accounts.accounts[0]).sort(), ['currency', 'id', 'name', 'status', 'timezone']);assert.equal(accounts.businesses[0].id, '999');
    assert.equal((await api(c, 'select-account', { method: 'POST', body: { accountId: 'act_wrong' } })).status, 400);
    assert.equal((await api(c, 'select-account', { method: 'POST', body: { accountId: 'act_789' } })).status, 200);
    const report = await (await api(c, 'campaigns?days=7')).json();assert.equal(report.rows[0].spend, 25.5);assert.equal(report.rows[0].dailyBudget, 5000);assert.equal(report.totals.reach, 750);
    assert.equal((await (await api(c, 'test', { method: 'POST', body: {} })).json()).ok, true);
    const safe = JSON.stringify([accounts, report, await (await api(c, 'status')).json()]);assert(!safe.includes(token));assert(!safe.includes(env.META_APP_SECRET));
    assert.equal(c.calls.filter((call) => new URL(call.url).pathname.endsWith('/oauth/access_token')).length, 2);
    assert.equal((await api(c, 'disconnect', { method: 'POST', body: {} })).status, 200);assert.equal((await c.store.repository.meta.get()).token_ciphertext, null);assert.equal((await metaStatus(env, c.store.repository.meta)).accountConnected, false);
  } finally {await c.store.close();}
});

test('state rejects wrong browser, replay, expiration, revoked sessions and changed role', async () => {
  const c = await setup();try {
    const f = await start(c);assert((await (await callback(c, { ...f, browser: 'a'.repeat(64) })).text()).includes('STATE_INVALID'));assert.equal(c.calls.length, 0);
    await callback(c, f);const calls = c.calls.length;assert((await (await callback(c, f)).text()).includes('STATE_INVALID'));assert.equal(c.calls.length, calls);
    const expired = await start(c);c.advance(600001);assert((await (await callback(c, expired)).text()).includes('STATE_INVALID'));
    const revoked = await start(c);await c.store.revokeSession(c.session);assert((await (await callback(c, revoked)).text()).includes('STATE_INVALID'));
    c.session = await c.store.createSession(c.user.id);const disabled = await start(c);
    const another = await c.store.repository.saveUser({ email: 'another@example.com', password: 'test-password-123456', confirm_password: 'test-password-123456', role: 'OWNER', active: true }, c.user);
    await c.store.repository.saveUser({ email: c.user.email, role: 'VIEWER', active: true }, { id: another.id, role: 'OWNER' }, c.user.id);
    assert((await (await callback(c, disabled)).text()).includes('STATE_INVALID'));
  } finally {await c.store.close();}
});

test('cancel and denied ads_read never overwrite an existing connection; errors never leak provider payload', async () => {
  const c = await setup();try {
    await callback(c, await start(c));const before = (await c.store.repository.meta.get()).token_ciphertext;
    const f = await start(c);const cancelled = await api(c, `callback?state=${f.state}&error=access_denied&error_description=raw-secret`, { browser: f.browser, session: undefined });const html = await cancelled.text();assert(html.includes('OAUTH_CANCELLED'));assert(!html.includes('raw-secret'));assert.equal((await c.store.repository.meta.get()).token_ciphertext, before);
    const original = c.fetcher;c.fetcher = (url, options) => url.includes('/me/permissions') ? Promise.resolve(Response.json({ data: [] })) : original(url, options);
    assert((await (await callback(c, await start(c))).text()).includes('PERMISSION_DENIED'));assert.equal((await c.store.repository.meta.get()).token_ciphertext, before);
    c.fetcher = async () => Response.json({ error: { code: 190, message: 'raw-secret ' + token } }, { status: 400 });
    const response = await api(c, 'ad-accounts'),result = await response.json();assert.equal(response.status, 409);assert.equal(result.code, 'TOKEN_INVALID');assert(!JSON.stringify(result).includes(token));assert.equal((await c.store.repository.meta.get()).token_ciphertext, null);
  } finally {await c.store.close();}
});

test('all Meta routes enforce OWNER/ADMIN, POST origin and read-only permissions', async () => {
  const c = await setup();try {
    assert.equal((await api(c, 'connect', { session: undefined })).status, 401);
    assert.equal((await api(c, 'connect', { extraHeaders: { 'sec-fetch-site': 'cross-site' } })).status, 403);
    assert.equal((await api(c, 'disconnect', { method: 'POST', origin: 'https://evil.example', body: {} })).status, 403);
    assert.equal((await api(c, 'campaigns', { method: 'POST', body: {} })).status, 405);
    for (const role of ['MARKETING', 'SALES', 'VIEWER']) {
      const saved = await c.store.repository.saveUser({ email: role + '@example.com', role, active: true, password: 'test-password-123456', confirm_password: 'test-password-123456' }, c.user);
      const session = await c.store.createSession(saved.id);
      for (const path of ['connect', 'status', 'ad-accounts', 'campaigns']) assert.equal((await api(c, path, { session })).status, 403);
    }
  } finally {await c.store.close();}
});

test('configuration errors, ciphertext tampering, token expiry and disconnect invalidate authorization', async () => {
  for (const [key, code] of [['META_APP_ID', 'APP_ID_MISSING'], ['META_APP_SECRET', 'APP_SECRET_MISSING'], ['META_REDIRECT_URI', 'REDIRECT_URI_MISSING']]) await assert.rejects(async () => metaConfig({ ...env, [key]: '' }), (e) => e.code === code);
  await assert.rejects(async () => metaConfig({ ...env, META_REDIRECT_URI: 'https://evil.example/api/admin/meta/callback' }), (e) => e.code === 'REDIRECT_URI_INVALID');
  const c = await setup();try {
    const pending = await start(c);await api(c, 'disconnect', { method: 'POST', body: {} });assert((await (await callback(c, pending)).text()).includes('STATE_INVALID'));
    await callback(c, await start(c));c.advance(3600001);assert.equal((await metaStatus(env, c.store.repository.meta)).accountConnected, false);await assert.rejects(async () => await metaAccess(c.store.repository.meta, env), (e) => e.code === 'TOKEN_INVALID');
    const encrypted = encryptToken(token, env);const fake = { get: () => ({ app_id: env.META_APP_ID, token_ciphertext: encrypted.slice(0, -6) + 'broken', expires_at: Date.now() + 10000 }), now: Date.now };await assert.rejects(async () => await metaAccess(fake, env), (e) => e.code === 'TOKEN_INVALID');
  } finally {await c.store.close();}
});

test('pagination stays on graph.facebook.com and encryption survives repository recreation', async () => {
  let calls = 0;
  const client = createMetaClient(token, env, async (url) => {assert(new URL(url).origin === 'https://graph.facebook.com');calls++;return Response.json(calls === 1 ? { data: [{ id: 1 }], paging: { next: 'https://evil.example/steal', cursors: { after: 'cursor2' } } } : { data: [{ id: 2 }] });});
  assert.deepEqual((await client.list('me/adaccounts')).rows, [{ id: 1 }, { id: 2 }]);assert.equal(calls, 2);
  const { db } = await testStore();try {
    await migrate(db);
    const hash = createHash('sha256').update('test-session').digest('hex');await db.prepare("INSERT INTO users(id,email,role,active,password_hash) VALUES(?,?,?,?,'unused')").run('owner', 'owner@example.com', 'OWNER', 1);await db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash, 'owner', Date.now() + 100000);
    const repo = createRepository(db);assert(await repo.meta.save({ session_hash: hash, revision: 0 }, { appId: env.META_APP_ID, ciphertext: encryptToken(token, env), expiresAt: Date.now() + 100000, profile }));
    assert.equal((await metaStatus(env, createRepository(db).meta)).accountConnected, true);
    assert(!(await repo.meta.save({ session_hash: hash, revision: 0 }, { appId: env.META_APP_ID, ciphertext: 'stale', expiresAt: 0, profile })));
  } finally {await db.close();}
});

test('proxy permits only the GET OAuth callback without the Strict cookie, and protects every other Meta route', async () => {
  const require = createRequire(import.meta.url),swc = require('next/dist/build/swc');await swc.loadBindings();
  const source = readFileSync(new URL('../../proxy.js', import.meta.url), 'utf8');
  const compiled = await swc.transform(source, { filename: 'proxy.js', jsc: { parser: { syntax: 'ecmascript' }, target: 'es2022' }, module: { type: 'commonjs' } });
  let user = null;const module = { exports: {} };
  runInNewContext('(function(require,module,exports){' + compiled.code + '\n})')((id) => id === 'next/server' ? require('next/server.js') : { adminStore: () => ({ getSession: () => user }), configured: () => true, cookieName: () => cookieName(env), canAccess }, module, module.exports);
  const proxy = module.exports.proxy;
  assert.equal((await proxy(request('callback?state=test'))).headers.get('x-middleware-next'), '1');
  for (const route of ['connect', 'status', 'ad-accounts', 'campaigns', 'disconnect']) assert.equal((await proxy(request(route))).status, 401);
  assert.equal((await proxy(request('callback', { method: 'POST' }))).status, 401);
  assert.equal((await proxy(request('callback', { method: 'HEAD' }))).status, 401);
  user = { role: 'MARKETING' };assert.equal((await proxy(request('ad-accounts'))).status, 403);
  user = { role: 'OWNER' };assert.equal((await proxy(request('connect'))).headers.get('x-middleware-next'), '1');
  assert.equal((await proxy(request('callback'))).headers.get('Referrer-Policy'), 'no-referrer');
});

test('no ad accounts is an honest connected state; optional business permission does not block ads_read', async () => {
  const c = await setup();try {
    const original = c.fetcher;
    c.fetcher = (url, options) => url.includes('/me/adaccounts') ? Promise.resolve(Response.json({ data: [] })) : original(url, options);
    assert((await (await callback(c, await start(c))).text()).includes('NO_ACCOUNTS'));
    assert.equal((await metaStatus(env, c.store.repository.meta)).accountConnected, true);
    assert.equal((await metaStatus(env, c.store.repository.meta)).adAccountSelected, false);
    c.fetcher = (url, options) => new URL(url).searchParams.get('fields') === 'id,business{id,name}' ? Promise.resolve(Response.json({ error: { code: 200, message: 'private-error' } }, { status: 400 })) : original(url, options);
    const result = await (await api(c, 'ad-accounts')).json();assert.equal(result.accounts.length, 1);assert.equal(result.businessesAvailable, false);assert.deepEqual(result.businesses, []);
  } finally {await c.store.close();}
});

test('disconnect during code exchange cannot restore the connection; expiry and revoked grants never expose tokens', async () => {
  const c = await setup();try {
    const flow = await start(c),original = c.fetcher;let cleared = false;
    c.fetcher = async (url, options) => {if (!cleared && url.includes('/oauth/access_token')) {cleared = true;await c.store.repository.meta.clear((await c.store.repository.meta.get()).revision);}return original(url, options);};
    assert((await (await callback(c, flow)).text()).includes('CONNECTION_CHANGED'));
    assert.equal((await c.store.repository.meta.get()).token_ciphertext, null);
  } finally {await c.store.close();}
});
