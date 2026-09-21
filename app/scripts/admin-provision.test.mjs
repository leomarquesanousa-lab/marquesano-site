import test from 'node:test';
import assert from 'node:assert/strict';
import { testStore } from './postgres-test-store.mjs';
import { createAdminStore, hashPassword } from '../server/admin/core.mjs';
const password='isolated-password-123';
const env={ADMIN_INITIAL_OWNER_EMAIL:' Owner@Example.com ',ADMIN_INITIAL_OWNER_PASSWORD_HASH:await hashPassword(password)};
test('PostgreSQL OWNER is active, authenticates, and existing email is never modified',async()=>{
 const {store,db}=await testStore();try{
  assert.equal(await store.ensureInitialOwner(env),true);
  assert.equal((await store.authenticate('owner@example.com',password)).role,'OWNER');
  const before=await db.prepare('SELECT * FROM users').all();
  assert.equal(await store.ensureInitialOwner({...env,ADMIN_INITIAL_OWNER_PASSWORD_HASH:'ignored'}),false);
  assert.deepEqual(await db.prepare('SELECT * FROM users').all(),before);
  const reopened=await createAdminStore('postgresql://isolated/test',Date.now,{open:async()=>db});
  assert.equal(await reopened.ensureInitialOwner(env),false);
  assert.equal(await reopened.ensureInitialOwner({}),false);
  assert.deepEqual(await db.prepare('SELECT * FROM users').all(),before);
 }finally{await store.close();}
});
test('PostgreSQL provisions new email alongside old user and preserves old hash and role',async()=>{
 const {store,db}=await testStore();try{
  await store.createOwner('old@example.com',password);
  const old=await db.prepare('SELECT * FROM users').get();
  assert.equal(await store.ensureInitialOwner(env),true);
  assert.deepEqual(await db.prepare('SELECT * FROM users WHERE id=?').get(old.id),old);
  assert.equal((await db.prepare('SELECT count(*) AS n FROM users').get()).n,2);
 }finally{await store.close();}
});
test('invalid provisioning is rolled back',async()=>{
 const {store,db}=await testStore();try{
  for(const invalid of [{},{...env,ADMIN_INITIAL_OWNER_EMAIL:'bad'},{...env,ADMIN_INITIAL_OWNER_PASSWORD_HASH:'bad'}])await assert.rejects(store.ensureInitialOwner(invalid));
  assert.equal((await db.prepare('SELECT count(*) AS n FROM users').get()).n,0);
 }finally{await store.close();}
});
