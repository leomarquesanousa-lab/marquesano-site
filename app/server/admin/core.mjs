import { openPostgres, databaseUrlIssue } from './postgres.mjs';
import { adminDiagnostic } from './diagnostics.mjs';
import { adminOrigin } from './origin.mjs';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { migrate } from './migrations.mjs';
import { createRepository } from './repository.mjs';

const scrypt = promisify(scryptCallback);
const digest = (value) => createHash('sha256').update(value).digest('hex');
export { adminDiagnostic } from './diagnostics.mjs';
async function diagnosticStage(stage, operation) {
  try {return await operation();} catch (error) {adminDiagnostic(stage, error);throw error;}
}
export const roles = ['OWNER', 'ADMIN', 'MARKETING', 'SALES', 'VIEWER'];
export const modules = {
  'meta-ads': { title: 'Meta Ads', description: 'Campanhas, criativos e resultados da Meta.', roles: ['OWNER','ADMIN'] },
  vendas: { title: 'Vendas', description: 'Assinaturas, recebimentos e próximos vencimentos.', roles: ['OWNER','ADMIN'] },
  dashboard: { title: 'Dashboard', description: 'Visão geral do ambiente administrativo.', roles },
  marketing: { title: 'Marketing', description: 'Origens, campanhas e conversões registradas.', roles: ['OWNER', 'ADMIN', 'MARKETING'] },
  analytics: { title: 'Analytics', description: 'Dados locais e relatórios oficiais do Google.', roles: ['OWNER', 'ADMIN', 'MARKETING', 'VIEWER'] },
  leads: { title: 'Leads', description: 'Acompanhe oportunidades, responsáveis e próximos passos.', roles: ['OWNER', 'ADMIN', 'SALES'] },
  clientes: { title: 'Clientes', description: 'Dados de contato e histórico de relacionamento.', roles: ['OWNER', 'ADMIN', 'SALES'] },
  seo: { title: 'SEO', description: 'Diagnóstico técnico e Google Search Console.', roles: ['OWNER', 'ADMIN', 'MARKETING'] },
  configuracoes: { title: 'Configurações', description: 'Configurações administrativas e integrações.', roles: ['OWNER', 'ADMIN'] },
  pagamentos: { title: 'Pagamentos', description: 'Assinaturas, pagamentos e configuração dos planos.', roles: ['OWNER', 'ADMIN'] },
  formularios: { title: 'Formulários', description: 'Submissões recebidas e notificações por e-mail.', roles: ['OWNER', 'ADMIN', 'SALES'] },
  campanhas: { title: 'Campanhas', description: 'Campanhas e links de atribuição.', roles: ['OWNER', 'ADMIN', 'MARKETING'] },
  usuarios: { title: 'Usuários', description: 'Contas administrativas e permissões.', roles: ['OWNER','ADMIN'] },
  auditoria: { title: 'Auditoria', description: 'Histórico das operações administrativas.', roles: ['OWNER', 'ADMIN'] }
};
export function canAccess(role, module) {return Object.hasOwn(modules, module) && modules[module].roles.includes(role);}
export function cookieName(env = process.env) {return env.NODE_ENV === 'production' ? '__Host-marquesano_admin' : 'marquesano_admin';}
export function cookieOptions(env = process.env) {return { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 28800 };}
export function configured(env = process.env) {
  const issue = databaseUrlIssue(env.DATABASE_URL);
  if (issue) { adminDiagnostic(issue); return false; }
  try {
    const valid = Boolean(adminOrigin(env));
    adminDiagnostic(valid ? 'ADMIN_CONFIG_OK' : 'ADMIN_SITE_ORIGIN_INVALID');
    return valid;
  } catch { adminDiagnostic('ADMIN_SITE_ORIGIN_INVALID'); return false; }
}
export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password) > 256) throw Error('Use uma senha de 12 caracteres ou mais (máximo de 256 bytes).');
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${salt}$${key.toString('hex')}`;
}
export async function verifyPassword(password, encoded) {
  if (typeof password !== 'string' || Buffer.byteLength(password) > 256) return false;
  const [kind, salt, hash] = (encoded || '').split('$');
  if (kind !== 'scrypt' || !/^[a-f0-9]{32}$/.test(salt || '') || !/^[a-f0-9]{128}$/.test(hash || '')) return false;
  const key = await scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return timingSafeEqual(key, Buffer.from(hash, 'hex'));
}
const dummyHash = `scrypt$${'0'.repeat(32)}$${'0'.repeat(128)}`;

export async function createAdminStore(connectionString, now = Date.now, dependencies = {}) {
  const db = await diagnosticStage('ADMIN_POSTGRES_CONNECT_FAILED', () => (dependencies.open || openPostgres)(connectionString));
  adminDiagnostic('ADMIN_POSTGRES_CONNECTED');
  let repository;
  try {
    await diagnosticStage('ADMIN_MIGRATIONS_FAILED', () => db.transaction(async () => {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('OWNER','ADMIN','MARKETING','SALES','VIEWER')), active BIGINT NOT NULL DEFAULT 1);
        CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires BIGINT NOT NULL);
        CREATE TABLE IF NOT EXISTS login_limits (key TEXT PRIMARY KEY, count BIGINT NOT NULL, expires BIGINT NOT NULL);`);
      await (dependencies.migrate || migrate)(db);
    }));
    adminDiagnostic('ADMIN_MIGRATIONS_OK');
    repository = await diagnosticStage('ADMIN_REPOSITORY_FAILED', () => (dependencies.repository || createRepository)(db, now));
    adminDiagnostic('ADMIN_REPOSITORY_OK');
  } catch (error) {
    try { await db.close(); } catch (closeError) { adminDiagnostic('ADMIN_POSTGRES_CLOSE_FAILED', closeError); }
    throw error;
  }
  function transaction(fn) {return db.transaction(fn);}
  return {
    repository,
    close: () => db.close(),
    async ensureInitialOwner(env = process.env) {
      return await transaction(async () => {
        const email = typeof env.ADMIN_INITIAL_OWNER_EMAIL === 'string' ? env.ADMIN_INITIAL_OWNER_EMAIL.trim().toLowerCase() : '';
        const hash = env.ADMIN_INITIAL_OWNER_PASSWORD_HASH;
        if (!email && !hash && (await db.prepare('SELECT COUNT(*) AS count FROM users').get()).count > 0) return false;
        if (!email || !hash) throw Error('Provisionamento administrativo: configure ADMIN_INITIAL_OWNER_EMAIL e ADMIN_INITIAL_OWNER_PASSWORD_HASH para provisionar o OWNER.');
        if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) || email.length > 254) throw Error('Provisionamento administrativo: ADMIN_INITIAL_OWNER_EMAIL inválido.');
        if (await db.prepare('SELECT id FROM users WHERE lower(email)=lower(?)').get(email)) return false;
        if (typeof hash !== 'string' || !/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(hash)) throw Error('Provisionamento administrativo: ADMIN_INITIAL_OWNER_PASSWORD_HASH inválido; gere o hash com admin-password-hash.mjs.');
        await db.prepare('INSERT INTO users (id,email,password_hash,role,active) VALUES (?,?,?,?,1)').run(randomBytes(16).toString('hex'), email, hash, 'OWNER');
        return true;
      });
    },
    async createOwner(email, password) {
      email = email.trim().toLowerCase();
      if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) || email.length > 254) throw Error('E-mail inválido.');
      const hash = await hashPassword(password);
      await transaction(async () => {
        if (await db.prepare('SELECT id FROM users LIMIT 1').get()) throw Error('O primeiro usuário já foi cadastrado.');
        await db.prepare('INSERT INTO users (id,email,password_hash,role) VALUES (?,?,?,?)').run(randomBytes(16).toString('hex'), email, hash, 'OWNER');
      });
    },
    async consumeLogin(email) {
      return await transaction(async () => {
        await db.prepare('DELETE FROM login_limits WHERE expires <= ?').run(now());
        const keys = [['global', 100], [`email:${digest(email)}`, 5]];
        for (const [key, limit] of keys) {
          if (((await db.prepare('SELECT count FROM login_limits WHERE key=?').get(key))?.count || 0) >= limit) return false;
        }
        for (const [key] of keys) await db.prepare('INSERT INTO login_limits VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=login_limits.count+1').run(key, now() + 900000);
        return true;
      });
    },
    async authenticate(email, password) {
      const user = await db.prepare('SELECT * FROM users WHERE email=? AND active=1').get(email);
      const valid = await verifyPassword(password, user?.password_hash || dummyHash);
      return valid && user ? { id: user.id, email: user.email, role: user.role } : null;
    },
    async createSession(userId) {
      const token = randomBytes(32).toString('hex');
      await db.prepare('DELETE FROM sessions WHERE expires <= ?').run(now());
      await db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(digest(token), userId, now() + 28800000);
      return token;
    },
    async getSession(token) {
      if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return null;
      const user = await db.prepare('SELECT u.id,u.email,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1').get(digest(token), now());
      return user ? { id: user.id, email: user.email, role: user.role } : null;
    },
    async revokeSession(token) {if (typeof token === 'string') await db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(token));}
  };
}

const storeKey = Symbol.for('marquesano.admin.postgres.store');
export async function adminStore() {
  if (!configured()) throw Error('Configuração administrativa inválida.');
  if (!globalThis[storeKey]) {
    globalThis[storeKey] = (async () => {
      const store = await createAdminStore(process.env.DATABASE_URL);
      try { await store.ensureInitialOwner(); }
      catch (error) {
        adminDiagnostic('ADMIN_OWNER_PROVISION_FAILED', error);
        try { await store.close(); } catch (closeError) { adminDiagnostic('ADMIN_POSTGRES_CLOSE_FAILED', closeError); }
        throw error;
      }
      return store;
    })();
  }
  try {
    const store = await globalThis[storeKey];
    adminDiagnostic('ADMIN_STORE_READY');
    return store;
  } catch(error) { delete globalThis[storeKey]; throw error; }
}
