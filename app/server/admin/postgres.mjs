import pg from 'pg';
import { AsyncLocalStorage } from 'node:async_hooks';
import { adminDiagnostic } from './diagnostics.mjs';

// Preserve the existing numeric API for counters and millisecond timestamps.
const types = { getTypeParser(oid, format) {
  if (oid === 20) return value => {
    const number = Number(value);
    if (!Number.isSafeInteger(number)) throw Error('Database integer exceeds safe range.');
    return number;
  };
  return pg.types.getTypeParser(oid, format);
} };

export function postgresSql(source) {
  let sql = source;
  let index = 0;
  // Parameters are replaced only outside SQL string literals and quoted identifiers.
  sql = sql.replace(/'(?:''|[^'])*'|"(?:""|[^"])*"|\?/g, token => token === '?' ? `$${++index}` : token);
  return sql;
}

export function databaseUrlIssue(value) {
  if (typeof value !== 'string' || !value.trim()) return 'ADMIN_DATABASE_URL_MISSING';
  try {
    const url = new URL(value);
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname) return 'ADMIN_DATABASE_URL_INVALID';
  } catch { return 'ADMIN_DATABASE_URL_INVALID'; }
  return null;
}

export async function openPostgres(connectionString) {
  const issue = databaseUrlIssue(connectionString);
  if (issue) {
    adminDiagnostic(issue);
    throw Error(issue === 'ADMIN_DATABASE_URL_MISSING' ? 'DATABASE_URL ausente no ambiente do processo.' : 'DATABASE_URL possui formato inválido.');
  }
  const pool = new pg.Pool({ connectionString, max: 5, connectionTimeoutMillis: 10000, idleTimeoutMillis: 30000, types });
  pool.on('error', error => adminDiagnostic('ADMIN_POSTGRES_POOL_FAILED', error));
  try { await pool.query('SELECT 1'); } catch (error) { await pool.end(); throw error; }
  return createPostgresAdapter(pool);
}

export function createPostgresAdapter(pool) {
  const context = new AsyncLocalStorage();
  async function query(sql, params = []) { return (context.getStore() || pool).query(postgresSql(sql), params); }
  return {
    query,
    exec: sql => query(sql),
    prepare(sql) { return {
      get: async (...args) => (await query(sql, args)).rows[0],
      all: async (...args) => (await query(sql, args)).rows,
      run: async (...args) => ({ changes: (await query(sql, args)).rowCount }),
    }; },
    async transaction(fn) {
      if (context.getStore()) return fn();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // Serializes read/modify/write transactions across instances, retaining
        // the prior single-writer guarantees (OWNER, limits, webhook receipts).
        await client.query('SELECT pg_advisory_xact_lock(714629031)');
        const result = await context.run(client, fn);
        await client.query('COMMIT');
        return result;
      } catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
    },
    close: () => pool.end(),
  };
}
