import { DatabaseSync } from 'node:sqlite';
import { openPostgres } from '../server/admin/postgres.mjs';
import { createAdminStore, adminDiagnostic } from '../server/admin/core.mjs';
import { loadLocalCheckoutEnv } from './local-env.mjs';

// Explicit offline migration, never imported by the administrative runtime.
loadLocalCheckoutEnv();
let source, db;
try {
  if (process.argv[2] !== '--sqlite' || !process.argv[3] || process.argv.length !== 4) throw Error('Use --sqlite <backup>.');
  source = new DatabaseSync(process.argv[3], { readOnly: true });
  source.exec('PRAGMA query_only=ON; BEGIN');
  const owners = source.prepare("SELECT id,email,password_hash,role,active FROM users WHERE role='OWNER' AND active=1").all();
  if (owners.length !== 1) throw Error('A recuperação exige exatamente um OWNER ativo no backup.');
  const owner = owners[0];
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(owner.email) || owner.email.length > 254 || !/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(owner.password_hash)) throw Error('Formato de credenciais do backup inválido.');
  db = await openPostgres(process.env.DATABASE_URL);
  await createAdminStore(process.env.DATABASE_URL, Date.now, { open: async () => db });
  const restored = await db.transaction(async () => {
    const existing = await db.prepare('SELECT id,email,password_hash,role,active FROM users').all();
    if (existing.length) {
      if (existing.length === 1 && Object.keys(owner).every(key => existing[0][key] === owner[key])) return false;
      throw Error('O banco de destino já possui usuários; nenhuma conta será sobrescrita.');
    }
    await db.prepare('INSERT INTO users(id,email,password_hash,role,active) VALUES(?,?,?,?,?)').run(owner.id, owner.email, owner.password_hash, owner.role, owner.active);
    return true;
  });
  console.info('ADMIN_OWNER_RECOVERY_OK', { restored, role: 'OWNER', active: true, original_credentials_preserved: true });
} catch (error) { adminDiagnostic('ADMIN_OWNER_RECOVERY_FAILED', error); process.exitCode = 1; }
finally { source?.close(); await db?.close(); }
