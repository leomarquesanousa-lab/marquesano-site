import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createAdminStore, hashPassword, adminStore } from '../server/admin/core.mjs';

const password = randomBytes(24).toString('hex');
const env = { ADMIN_INITIAL_OWNER_EMAIL: ' Owner@Example.com ', ADMIN_INITIAL_OWNER_PASSWORD_HASH: await hashPassword(password) };

test('empty database provisions exactly one active OWNER who authenticates; repeated initialization is a no-op', async () => {
  const store = createAdminStore(':memory:');
  try {
    assert.equal(store.ensureInitialOwner(env), true);
    const user = await store.authenticate('owner@example.com', password);
    assert.equal(user.role, 'OWNER');
    assert.equal(store.ensureInitialOwner(env), false);
    assert.equal(store.ensureInitialOwner({}), false);
    assert.equal(store.ensureInitialOwner({ ...env, ADMIN_INITIAL_OWNER_PASSWORD_HASH: 'ignored-for-existing-email' }), false);
    assert.deepEqual(await store.authenticate('owner@example.com', password), user);
  } finally { store.close(); }
});

test('invalid email, hash and missing variables refuse provisioning without inserting any user', () => {
  const store = createAdminStore(':memory:');
  try {
    for (const invalid of [{}, {...env, ADMIN_INITIAL_OWNER_EMAIL: 'bad'}, {...env, ADMIN_INITIAL_OWNER_PASSWORD_HASH: 'bad'}, {...env, ADMIN_INITIAL_OWNER_PASSWORD_HASH: env.ADMIN_INITIAL_OWNER_PASSWORD_HASH + '$extra'}]) {
      assert.throws(() => store.ensureInitialOwner(invalid), /Provisionamento administrativo:/);
    }
    assert.equal(store.ensureInitialOwner(env), true);
  } finally { store.close(); }
});

test('adminStore preserves an old user, provisions a different OWNER, and never duplicates on subsequent startups', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'admin-provision-'));
  const filename = join(dir, 'admin.sqlite');
  const keys = ['ADMIN_DATABASE_PATH', 'ADMIN_SITE_ORIGIN', ...Object.keys(env)];
  const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  const key = Symbol.for('marquesano.admin.store');
  assert.equal(globalThis[key], undefined);
  try {
    const oldStore = createAdminStore(filename);
    await oldStore.createOwner('old@example.com', password);
    oldStore.close();
    const db = new DatabaseSync(filename);
    const oldUser = db.prepare('SELECT * FROM users WHERE email=?').get('old@example.com');
    Object.assign(process.env, env, { ADMIN_DATABASE_PATH: filename, ADMIN_SITE_ORIGIN: 'https://marquesano.com.br' });
    const first = adminStore();
    assert.ok(await first.authenticate('owner@example.com', password));
    first.close(); delete globalThis[key];
    const before = db.prepare('SELECT * FROM users').all();
    assert.equal(before.length, 2);
    assert.equal(before.find(user=>user.email==='owner@example.com').active, 1);
    assert.deepEqual(db.prepare('SELECT * FROM users WHERE email=?').get('old@example.com'), oldUser);
    adminStore();
    assert.deepEqual(db.prepare('SELECT * FROM users').all(), before);
    globalThis[key].close(); delete globalThis[key];
    // Matching email is never modified, even if inactive, differently cased or non-OWNER.
    db.prepare("UPDATE users SET email='OWNER@example.com',role='VIEWER',active=0 WHERE email='owner@example.com'").run();
    const existing = db.prepare('SELECT * FROM users').all();
    adminStore();
    assert.deepEqual(db.prepare('SELECT * FROM users').all(), existing);
    globalThis[key].close(); delete globalThis[key];
    delete process.env.ADMIN_INITIAL_OWNER_EMAIL; delete process.env.ADMIN_INITIAL_OWNER_PASSWORD_HASH;
    adminStore();
    assert.deepEqual(db.prepare('SELECT * FROM users').all(), existing);
    db.close();
  } finally {
    globalThis[key]?.close(); delete globalThis[key];
    for (const name of keys) { if (saved[name] === undefined) delete process.env[name]; else process.env[name] = saved[name]; }
    rmSync(dir, { recursive: true, force: true });
  }
});
