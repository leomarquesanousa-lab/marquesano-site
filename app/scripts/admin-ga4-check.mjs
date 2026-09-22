import { loadLocalCheckoutEnv } from './local-env.mjs';
import { openPostgres } from '../server/admin/postgres.mjs';
import { createRepository } from '../server/admin/repository.mjs';
import { operations } from '../server/admin/operations.mjs';

// Read-only: uses existing tables; no migrations, OWNER or session changes.
loadLocalCheckoutEnv();
let db;
try {
  db = await openPostgres(process.env.DATABASE_URL);
  const repository = createRepository(db);
  const settings = await repository.settings();
  console.info('GA4_CONFIGURATION', {
    property: settings.GA4_PROPERTY_ID,
    service_account_available: Boolean(process.env.GOOGLE_CLIENT_EMAIL),
    private_key_available: Boolean(process.env.GOOGLE_PRIVATE_KEY)
  });
  const data = await operations(new Request('https://marquesano.com.br/api/admin/analytics?days=30&remote=1'),
    ['analytics'], { role: 'OWNER' }, repository);
  console.info('GA4_REPORT', JSON.stringify({
    period: data.period, status: data.google?.status, code: data.google?.code,
    message: data.google?.message, summary: data.google?.reports?.summary,
    row_counts: data.google?.reports && Object.fromEntries(Object.entries(data.google.reports).map(([key, report]) => [key, report.rowCount]))
  }));
  if (data.google?.status !== 'Ativo') process.exitCode = 1;
} catch {
  console.error('GA4_CHECK_FAILED: falha ao carregar o ambiente ou ler os dados administrativos.');
  process.exitCode = 1;
} finally { await db?.close(); }
