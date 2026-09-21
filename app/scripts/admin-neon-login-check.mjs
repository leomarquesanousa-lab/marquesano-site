import next from 'next';
import { createServer } from 'node:http';
import { createConnection } from 'node:net';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
import { openPostgres } from '../server/admin/postgres.mjs';
import { hashPassword, adminDiagnostic } from '../server/admin/core.mjs';
import { loadLocalCheckoutEnv, projectRoot } from './local-env.mjs';

// Real Next.js routes and real Neon, with a disposable schema and in-memory
// credentials. No production account, password or session is changed.
loadLocalCheckoutEnv();
const busy = await new Promise(resolve => {
  const socket = createConnection({ host: '127.0.0.1', port: 3000 });
  const finish = value => { socket.destroy(); resolve(value); };
  socket.once('connect', () => finish(true)); socket.once('error', () => finish(false)); socket.setTimeout(2000, () => finish(false));
});
if (busy) {
  console.error('Pare temporariamente npm run dev antes deste teste; o Next exige uma única instância por projeto.');
  process.exit(1);
}
const schema = 'admin_http_check_' + randomBytes(8).toString('hex');
let db, app, server;
try {
  db = await openPostgres(process.env.DATABASE_URL);
  await db.exec(`CREATE SCHEMA ${schema}`);
  const scoped = new URL(process.env.DATABASE_URL);
  scoped.searchParams.set('options', `-c search_path=${schema}`);
  process.env.DATABASE_URL = scoped.href;
  process.env.NODE_ENV = 'development';
  process.env.ADMIN_SITE_ORIGIN = 'http://127.0.0.1:3011';
  const password = randomBytes(32).toString('hex');
  const email = randomBytes(8).toString('hex') + '@example.invalid';
  process.env.ADMIN_INITIAL_OWNER_EMAIL = email;
  process.env.ADMIN_INITIAL_OWNER_PASSWORD_HASH = await hashPassword(password);
  app = next({ dev: true, webpack: true, dir: projectRoot, hostname: '127.0.0.1', port: 3011, conf: { distDir: '.next-admin-diagnostic' } });
  await app.prepare();
  const handle = app.getRequestHandler();
  server = createServer((request, response) => { void handle(request, response); });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(3011, '127.0.0.1', resolve); });
  const origin = process.env.ADMIN_SITE_ORIGIN;
  const call = (path, body, cookie) => fetch(origin + path, {
    method: body ? 'POST' : 'GET', redirect: 'manual', signal: AbortSignal.timeout(60000),
    headers: { Origin: origin, ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const page = await call('/admin/login');
  assert.equal(page.status, 200);
  assert.ok((await page.text()).includes('Acesso privado'));
  console.info('NEON_ADMIN_LOGIN_PAGE_OK');
  const rejected = await call('/api/admin/login', { email, password: 'intentionally-wrong-password' });
  assert.equal(rejected.status, 401);
  assert.equal((await rejected.json()).error, 'Credenciais inválidas.');
  const accepted = await call('/api/admin/login', { email, password });
  assert.equal(accepted.status, 200);
  assert.equal((await accepted.json()).ok, true);
  const setCookie = accepted.headers.get('set-cookie');
  assert.ok(setCookie?.includes('HttpOnly') && setCookie.includes('SameSite=strict'));
  const cookie = setCookie.split(';')[0];
  console.info('NEON_ADMIN_LOGIN_HTTP_200');
  const session = await call('/api/admin/session', undefined, cookie);
  assert.equal(session.status, 200);
  assert.equal((await session.json()).user.role, 'OWNER');
  console.info('NEON_ADMIN_SESSION_HTTP_200');
  const logout = await call('/api/admin/logout', {}, cookie);
  assert.equal(logout.status, 200);
  assert.equal((await call('/api/admin/session', undefined, cookie)).status, 401);
  console.info('NEON_ADMIN_SESSION_REVOKED_OK');
  const counts = (await db.query(`SELECT count(*)::int AS n FROM ${schema}.users WHERE role='OWNER' AND active=1`)).rows[0];
  assert.equal(counts.n, 1);
  console.info('NEON_ADMIN_RUNTIME_CHECK_OK');
} catch (error) { adminDiagnostic('NEON_ADMIN_RUNTIME_CHECK_FAILED', error); process.exitCode = 1; }
finally {
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  await app?.close();
  const store = await globalThis[Symbol.for('marquesano.admin.postgres.store')]?.catch(() => null);
  await store?.close();
  if (db) {
    await db.exec(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await db.close();
    console.info('NEON_ADMIN_TEMP_SCHEMA_REMOVED');
  }
}
// Next development compiler may retain watcher handles after app.close().
// All HTTP, database and temporary-schema cleanup has completed above.
process.exit(process.exitCode || 0);
