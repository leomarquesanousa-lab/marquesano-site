import test from 'node:test';
import assert from 'node:assert/strict';
import { adminDiagnostic, configured, createAdminStore } from '../server/admin/core.mjs';
import { databaseUrlIssue } from '../server/admin/postgres.mjs';
import { handleAdminApi } from '../server/admin/api.mjs';
import { NextRequest } from 'next/server.js';

function capture(t) {
  const messages = [], info = console.info, error = console.error;
  console.info = (...args) => messages.push(args); console.error = (...args) => messages.push(args);
  t.after(() => { console.info = info; console.error = error; });
  return messages;
}
test('configuration distinguishes missing URL, invalid URL and invalid site origin without exposing values', t => {
  const logs = capture(t);
  assert.equal(databaseUrlIssue(undefined), 'ADMIN_DATABASE_URL_MISSING');
  assert.equal(configured({ ADMIN_SITE_ORIGIN: 'https://example.test' }), false);
  assert.equal(configured({ DATABASE_URL: 'sqlite://private-file', ADMIN_SITE_ORIGIN: 'https://example.test' }), false);
  assert.equal(configured({ DATABASE_URL: 'postgresql://db/test', ADMIN_SITE_ORIGIN: 'invalid-secret-value' }), false);
  const text = JSON.stringify(logs);
  for (const code of ['ADMIN_DATABASE_URL_MISSING','ADMIN_DATABASE_URL_INVALID','ADMIN_SITE_ORIGIN_INVALID']) assert.ok(text.includes(code));
  assert.ok(!text.includes('private-file') && !text.includes('invalid-secret-value'));
});
test('connection, transaction/migration and repository failures are distinguished and resources closed', async t => {
  const logs = capture(t);
  await assert.rejects(createAdminStore('postgresql://db/test', Date.now, { open: async () => { throw Object.assign(Error('private-host timeout'), { code: 'ETIMEDOUT' }); } }));
  let closed = 0;
  const db = { close: async () => { closed++; }, exec: async () => {}, transaction: async fn => fn() };
  await assert.rejects(createAdminStore('postgresql://db/test', Date.now, { open: async () => db, migrate: async () => { throw Error('private SQL contents'); } }));
  await assert.rejects(createAdminStore('postgresql://db/test', Date.now, { open: async () => db, migrate: async () => {}, repository: () => { throw TypeError('private repository details'); } }));
  assert.equal(closed, 2);
  const text = JSON.stringify(logs);
  for (const code of ['ADMIN_POSTGRES_CONNECT_FAILED','ADMIN_POSTGRES_CONNECTED','ADMIN_MIGRATIONS_FAILED','ADMIN_MIGRATIONS_OK','ADMIN_REPOSITORY_FAILED']) assert.ok(text.includes(code));
  assert.ok(!text.includes('private'));
});
test('safe diagnostics never print arbitrary error text, credentials, email, tokens or stack', t => {
  const logs = capture(t);
  const secret = 'postgresql://person:password@host/db owner@example.test scrypt$fullhash bearer-token';
  adminDiagnostic('ADMIN_OWNER_PROVISION_FAILED', Object.assign(Error(secret), { code: secret, name: secret }));
  const text = JSON.stringify(logs);
  for (const value of ['postgresql://','password','owner@example','fullhash','bearer-token']) assert.ok(!text.includes(value));
});
test('API logs configuration failure and preserves generic client response', async t => {
  const logs = capture(t);
  const response = await handleAdminApi(new NextRequest('https://example.test/api/admin/login'), ['login'], { env: {} });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, 'Acesso administrativo indisponível.');
  assert.ok(JSON.stringify(logs).includes('ADMIN_API_FAILED'));
});
