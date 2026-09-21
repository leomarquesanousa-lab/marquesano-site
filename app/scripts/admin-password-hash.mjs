import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { hashPassword } from '../server/admin/core.mjs';

if (!process.stdin.isTTY) {
  console.error('Execute em um terminal interativo. Não forneça senha por argumento ou variável.');
  process.exit(1);
}
const output = new Writable({ write(chunk, encoding, callback) { callback(); } });
const prompt = createInterface({ input: process.stdin, output, terminal: true });
let password = '', confirmation = '';
try {
  process.stderr.write('Senha (mínimo 12 caracteres; entrada oculta): ');
  password = await prompt.question('');
  process.stderr.write('\nConfirme a senha: ');
  confirmation = await prompt.question('');
  process.stderr.write('\n');
  if (password !== confirmation) throw Error('As senhas não coincidem.');
  const hash = await hashPassword(password);
  process.stdout.write(`ADMIN_INITIAL_OWNER_PASSWORD_HASH=${hash}\n`);
} catch (error) {
  const safe = ['As senhas não coincidem.', 'Use uma senha de 12 caracteres ou mais (máximo de 256 bytes).'];
  console.error(safe.includes(error.message) ? error.message : 'Não foi possível gerar o hash.');
  process.exitCode = 1;
} finally {
  password = ''; confirmation = '';
  prompt.close();
}
