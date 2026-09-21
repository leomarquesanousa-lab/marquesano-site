import nextEnv from '@next/env';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { createAdminStore, configured } from '../server/admin/core.mjs';

nextEnv.loadEnvConfig(fileURLToPath(new URL('../../', import.meta.url)), process.env.NODE_ENV !== 'production');
if (!configured()) {
  console.error('Configure DATABASE_URL e ADMIN_SITE_ORIGIN antes de cadastrar o OWNER.');
  process.exit(1);
}
if (!process.stdin.isTTY) { console.error('Execute em um terminal interativo. A senha não é aceita como argumento ou variável de ambiente.'); process.exit(1); }
let hidden = false;
const output = new Writable({ write(chunk, encoding, callback) { if (!hidden) process.stdout.write(chunk, encoding); callback(); } });
const prompt = createInterface({ input: process.stdin, output, terminal: true });
let store;
try {
  const email = await prompt.question('E-mail do primeiro OWNER: ');
  process.stdout.write('Senha (mínimo 12 caracteres; entrada oculta): '); hidden = true;
  const password = await prompt.question('');
  hidden = false; process.stdout.write('\nConfirme a senha: '); hidden = true;
  const confirmation = await prompt.question('');
  hidden = false; process.stdout.write('\n');
  if (password !== confirmation) throw Error('As senhas não coincidem.');
  store = await createAdminStore(process.env.DATABASE_URL);
  await store.createOwner(email, password);
  console.log('Primeiro OWNER cadastrado. Acesse /admin/login.');
} catch (error) {
  hidden = false;
  const safe = ['As senhas não coincidem.', 'O primeiro usuário já foi cadastrado.', 'E-mail inválido.', 'Use uma senha de 12 caracteres ou mais (máximo de 256 bytes).'];
  console.error(safe.includes(error.message) ? error.message : 'Não foi possível cadastrar o OWNER. Verifique a configuração e a permissão de escrita do banco.');
  process.exitCode = 1;
} finally { prompt.close(); await store?.close(); }
