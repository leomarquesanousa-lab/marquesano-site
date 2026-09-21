import { createPostgresAdapter } from '../server/admin/postgres.mjs';
import { createAdminStore } from '../server/admin/core.mjs';
import { pathToFileURL } from 'node:url';

// Optional local PostgreSQL WASM engine, installed outside the project for tests.
export async function testDatabase() {
  if (!process.env.ADMIN_PGLITE_MODULE) throw Error('Set ADMIN_PGLITE_MODULE to the local PGlite module for isolated tests.');
  const { PGlite } = await import(pathToFileURL(process.env.ADMIN_PGLITE_MODULE).href);
  const engine = new PGlite();
  const client = {
    async query(sql, args = []) {
      const result = args.length ? await engine.query(sql, args) : (await engine.exec(sql)).at(-1);
      return { rows: result?.rows || [], rowCount: result?.affectedRows || 0 };
    },
    release() {},
  };
  let tail = Promise.resolve();
  const adapter = createPostgresAdapter({ ...client, connect: async () => {
    const previous=tail; let release;
    tail=new Promise(resolve=>{release=resolve;});
    await previous;
    return {...client,release};
  }, end: () => engine.close() });
  return adapter;
}
export async function createTestAdminStore(unused, now = Date.now) { return (await testStore(now)).store; }

export async function testStore(now = Date.now) {
 const db=await testDatabase();
 const store=await createAdminStore('postgresql://isolated/test',now,{open:async()=>db});
 return {store,db};
}
