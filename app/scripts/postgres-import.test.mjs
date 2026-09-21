import test from 'node:test';
import assert from 'node:assert/strict';
import { testDatabase, testStore } from './postgres-test-store.mjs';
import { importAdminData } from '../server/admin/import-data.mjs';
import { adminTables } from '../server/admin/tables.mjs';

test('import preserves every row, rejects initialized targets and rolls back broken foreign keys', async () => {
  const {store,db:original} = await testStore();
  const target=await testDatabase(), broken=await testDatabase();
  try {
    await store.createOwner('import@example.invalid','import-test-password');
    const user=await store.authenticate('import@example.invalid','import-test-password');
    const session=await store.createSession(user.id);
    await store.repository.plans.finish(await store.repository.plans.start('basico'),'preserved_provider');
    const rows={},columns={};
    for(const table of adminTables){
      rows[table]=await original.prepare(`SELECT * FROM ${table}`).all();
      columns[table]=(await original.query('SELECT column_name AS name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name=$1 ORDER BY ordinal_position',[table])).rows;
    }
    const source={prepare(sql){
      const table=sql.match(/"([a-z_]+)"/)[1];
      return {all:()=>structuredClone(columns[table]),iterate:()=>structuredClone(rows[table])};
    }};
    await importAdminData(source,target);
    for(const table of adminTables)assert.deepEqual(await target.prepare(`SELECT * FROM ${table}`).all(),rows[table]);
    await assert.rejects(importAdminData(source,target),/Target must be empty/);
    assert.ok(session);
    rows.sessions[0].user_id='missing';
    await assert.rejects(importAdminData(source,broken));
    assert.equal((await broken.query("SELECT to_regclass('users') AS existing")).rows[0].existing,null);
  } finally {await store.close();await target.close();await broken.close();}
});
