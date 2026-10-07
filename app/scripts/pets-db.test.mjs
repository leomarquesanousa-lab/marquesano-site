import assert from 'node:assert/strict';
import {loadLocalCheckoutEnv} from './local-env.mjs';
import {adminStore,adminDatabase} from '../server/admin/core.mjs';
import {db,sql,transaction} from '../pets/lib/db.mjs';
import {migratePets} from '../pets/lib/migrate.mjs';
loadLocalCheckoutEnv();
const key=Symbol.for('marquesano.admin.postgres.store');
let queries=0,transactions=0;
const adapter={query:async()=>{queries++;return {rows:[{ok:1}]};},transaction:async fn=>{transactions++;return fn();},close:async()=>{}};
globalThis[key]=Promise.resolve({database:adapter});
assert.equal(await adminDatabase(),adapter);
await db();await db();
assert.equal(queries,0);assert.equal(transactions,0); // Opening Pets cannot run migrations.
assert.deepEqual(await sql('SELECT 1'),[{ok:1}]);
await transaction(async()=>assert.equal(await adminDatabase(),adapter));
assert.equal(queries,1);assert.equal(transactions,1);

const versions=new Set();let schemaSteps=0;
const migrationAdapter={transaction:async fn=>fn(),exec:async text=>{if(text.includes('CREATE INDEX')||text.startsWith('-- Preserve'))schemaSteps++;},prepare:text=>({get:async version=>versions.has(version)?{version}:undefined,run:async(...args)=>{if(text.startsWith('INSERT INTO pet_migrations'))versions.add(args[0]);}})};
await migratePets(migrationAdapter);const first=schemaSteps;assert.equal(versions.size,3);
await migratePets(migrationAdapter);assert.equal(schemaSteps,first);

// Reproduce the exact old cached-store shape. Rebuild once, sharing the replacement.
let closed=0;
globalThis[key]=Promise.resolve({close:async()=>{closed++;await Promise.resolve();}});
let store;
try{
 const [a,b]=await Promise.all([adminDatabase(),adminDatabase()]);store=await adminStore();
 assert.equal(closed,1);assert.equal(a,b);assert.equal(a,store.database);
 assert.equal((await a.query('SELECT 1 AS ok')).rows[0].ok,1);
 console.log('Pets DB: cache legado recuperado uma vez; adapter compartilhado; db() sem migrations; migrations idempotentes.');
}finally{await store?.close();delete globalThis[key];}
