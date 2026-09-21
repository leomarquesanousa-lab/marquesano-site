import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { loadLocalCheckoutEnv, projectRoot } from './local-env.mjs';

process.env.NODE_ENV = 'development';
loadLocalCheckoutEnv();
console.info('CHECKOUT_LOCAL_ENV', {
  database_available: Boolean(process.env.DATABASE_URL),
  public_key_available: Boolean(process.env.MERCADOPAGO_PUBLIC_KEY),
  access_token_available: Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN),
});
const require = createRequire(import.meta.url);
const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', '--webpack', ...process.argv.slice(2)], {
  cwd: projectRoot, env: process.env, stdio: 'inherit', windowsHide: true,
});
child.on('error', () => { console.error('Não foi possível iniciar o Next.js local.'); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
