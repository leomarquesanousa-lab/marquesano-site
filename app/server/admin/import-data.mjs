import { createAdminStore } from './core.mjs';
import { adminTables } from './tables.mjs';

export async function importAdminData(source, db) {
  await db.transaction(async () => {
    // Refuse any initialized target, even if it appears empty. Never merge IDs.
    for (const table of [...adminTables, 'schema_migrations']) {
      if ((await db.query('SELECT to_regclass($1) AS existing', [table])).rows[0].existing) throw Error('Target must be empty');
    }
    await createAdminStore('postgresql://import/target', Date.now, { open: async () => ({ ...db, close: async () => {} }) });
    await db.exec('DELETE FROM meta_connection; DELETE FROM subscription_plans;');
    for (const table of adminTables) {
      const columns = source.prepare(`PRAGMA table_info("${table}")`).all().map(column => column.name);
      if (!columns.length || columns.some(column => !/^[a-z_]+$/.test(column))) throw Error('Unexpected schema');
      let count = 0;
      const insert = db.prepare(`INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(',')}) VALUES (${columns.map(() => '?').join(',')})`);
      for (const row of source.prepare(`SELECT * FROM "${table}"`).iterate()) {
        await insert.run(...columns.map(column => row[column])); count++;
      }
      if ((await db.prepare(`SELECT count(*) AS n FROM "${table}"`).get()).n !== count) throw Error('Row count mismatch');
    }
  });
}
