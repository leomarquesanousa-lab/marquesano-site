import nextEnv from '@next/env';
import { fileURLToPath } from 'node:url';
import { createAdminStore, adminDiagnostic } from '../server/admin/core.mjs';
nextEnv.loadEnvConfig(fileURLToPath(new URL('../../',import.meta.url)),process.env.NODE_ENV!=='production');
let store;
try {
  store=await createAdminStore(process.env.DATABASE_URL);
  console.log('PostgreSQL migrations OK. Existing records preserved.');
} catch(error) { adminDiagnostic('ADMIN_DB_MIGRATION_FAILED',error); process.exitCode=1; }
finally { await store?.close(); }
