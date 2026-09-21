import nextEnv from '@next/env';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import assert from 'node:assert/strict';
import { openPostgres } from '../server/admin/postgres.mjs';
import { createAdminStore, hashPassword } from '../server/admin/core.mjs';

nextEnv.loadEnvConfig(fileURLToPath(new URL('../../', import.meta.url)), process.env.NODE_ENV !== 'production');
// Local diagnostic only: the IDE workspace can keep its .env inside app/.
// An explicitly supplied DATABASE_URL always takes precedence.
if (!process.env.DATABASE_URL && process.env.NODE_ENV !== 'production') {
  const localEnv = new URL('../.env', import.meta.url);
  if (existsSync(localEnv)) {
    const value = parseEnv(readFileSync(localEnv, 'utf8')).DATABASE_URL;
    if (value) {
      process.env.DATABASE_URL = value;
      console.log('POSTGRES_CHECK_ENV_SOURCE: app/.env (DATABASE_URL ausente no ambiente da raiz)');
    }
  }
}
let connection, store;
const schema = 'admin_check_' + randomBytes(10).toString('hex');
function logCheckError(error) {
  const secrets = Object.entries(process.env)
    .filter(([key, value]) => value && /URL|PASSWORD|SECRET|TOKEN|KEY|EMAIL/i.test(key))
    .map(([, value]) => value);
  try {
    const url = new URL(process.env.DATABASE_URL);
    secrets.push(url.username, url.password, decodeURIComponent(url.username), decodeURIComponent(url.password));
  } catch {}
  function redact(value) {
    let result = String(value || '');
    for (const secret of secrets.filter(Boolean).sort((a,b)=>b.length-a.length)) result = result.split(secret).join('[REDACTED]');
    return result.replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, '[DATABASE_URL REDACTED]');
  }
  console.error({stage:'ADMIN_POSTGRES_CHECK_FAILED',name:redact(error.name),message:redact(error.message),stack:redact(error.stack)});
}
try {
  connection = await openPostgres(process.env.DATABASE_URL);
  console.log('POSTGRES_CONNECTION_OK');
  await connection.exec(`CREATE SCHEMA ${schema}`);
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.set('options', `-c search_path=${schema}`);
  store = await createAdminStore(url.href);
  console.log('POSTGRES_MIGRATIONS_OK');
  const password = randomBytes(24).toString('hex');
  const email = 'diagnostic@example.invalid';
  const env = { ADMIN_INITIAL_OWNER_EMAIL: email, ADMIN_INITIAL_OWNER_PASSWORD_HASH: await hashPassword(password) };
  assert.equal(await store.ensureInitialOwner(env), true);
  assert.equal(await store.ensureInitialOwner(env), false);
  const user = await store.authenticate(email, password);
  assert.equal(user.role, 'OWNER');
  const token = await store.createSession(user.id);
  assert.equal((await store.getSession(token)).id, user.id);
  await store.revokeSession(token);
  assert.equal(await store.getSession(token), null);
  console.log('POSTGRES_OWNER_LOGIN_SESSION_OK');
  const plans = store.repository.plans;
  assert.equal((await plans.list()).length, 3);
  await plans.finish(await plans.start('basico'), 'diagnostic_plan_id');
  const billing = store.repository.billing;
  assert.equal(await billing.plan('diagnostic_plan_id'), 'basico');
  const payload = { event: { key:'diagnostic_event',topic:'payment',id:'payment' },
    subscription:{id:'subscription',plan_id:'basico',status:'authorized',next_payment_date:null,payer_email:null,updated_at:Date.now()},
    payment:{id:'payment',subscription_id:'subscription',invoice_id:null,status:'approved',status_detail:null,amount_cents:9900,currency:'BRL',paid_at:null,updated_at:Date.now()} };
  assert.equal((await billing.apply(payload)).duplicate, false);
  assert.equal((await billing.apply(payload)).duplicate, true);
  assert.equal((await billing.report()).totals.payments, 1);
  console.log('POSTGRES_PLANS_PAYMENTS_WEBHOOK_DEDUP_OK');
  console.log('Diagnóstico isolado concluído. Nenhuma cobrança ou chamada externa foi realizada.');
} catch (error) { logCheckError(error); process.exitCode = 1; }
finally {
  await store?.close();
  if (connection) {
    await connection.exec(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await connection.close();
  }
}
