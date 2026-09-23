import nextEnv from '@next/env';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { fileURLToPath } from 'node:url';

export const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
export function loadLocalCheckoutEnv() {
  nextEnv.loadEnvConfig(projectRoot, true);
  // Development only. Hostinger continues using its injected environment.
  if (process.env.NODE_ENV === 'production') return;
  const file = new URL('../.env', import.meta.url);
  if (!existsSync(file)) return;
  const fallback = parseEnv(readFileSync(file, 'utf8'));
  for (const key of ['MERCADOPAGO_TEST_PUBLIC_KEY', 'MERCADOPAGO_TEST_ACCESS_TOKEN', 'MERCADOPAGO_TEST_BUYER_EMAIL', 'MERCADOPAGO_TEST_PLAN_ID', 'DATABASE_URL', 'ADMIN_SITE_ORIGIN', 'MERCADOPAGO_SITE_ORIGIN', 'MERCADOPAGO_PUBLIC_KEY', 'MERCADOPAGO_ACCESS_TOKEN']) {
    if (!process.env[key] && fallback[key]) process.env[key] = fallback[key];
  }
}
