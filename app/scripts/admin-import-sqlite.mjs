import nextEnv from '@next/env';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { openPostgres } from '../server/admin/postgres.mjs';
import { adminDiagnostic } from '../server/admin/core.mjs';
import { importAdminData } from '../server/admin/import-data.mjs';

nextEnv.loadEnvConfig(fileURLToPath(new URL('../../', import.meta.url)), process.env.NODE_ENV !== 'production');
let source, db;
try {
  if (process.argv[2] !== '--sqlite' || !process.argv[3] || process.argv.length !== 4) throw Error('Usage');
  source = new DatabaseSync(process.argv[3], { readOnly: true });
  source.exec('PRAGMA query_only=ON; BEGIN');
  const version = source.prepare('SELECT max(version) AS version FROM schema_migrations').get().version;
  if (version !== 4) throw Error('Expected SQLite schema version 4');
  db = await openPostgres(process.env.DATABASE_URL);
  await importAdminData(source, db);
  console.log('Importação PostgreSQL concluída e contagens verificadas. SQLite original preservado.');
} catch (error) {
  adminDiagnostic('ADMIN_IMPORT_FAILED', error);
  console.error('Importação recusada ou revertida. Use um PostgreSQL vazio e SQLite versão 4: node app/scripts/admin-import-sqlite.mjs --sqlite <arquivo>.');
  process.exitCode = 1;
} finally { source?.close(); await db?.close(); }
