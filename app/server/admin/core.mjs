import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdirSync } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';
import { migrate } from './migrations.mjs';
import { createRepository } from './repository.mjs';

const scrypt = promisify(scryptCallback);
const digest = value => createHash('sha256').update(value).digest('hex');
export const roles = ['OWNER', 'ADMIN', 'MARKETING', 'SALES', 'VIEWER'];
export const modules = {
  dashboard: { title: 'Dashboard', description: 'Visão geral do ambiente administrativo.', roles },
  marketing: { title: 'Marketing', description: 'Origens, campanhas e conversões registradas.', roles: ['OWNER', 'ADMIN', 'MARKETING'] },
  analytics: { title: 'Analytics', description: 'Dados locais e relatórios oficiais do Google.', roles: ['OWNER', 'ADMIN', 'MARKETING', 'VIEWER'] },
  leads: { title: 'Leads', description: 'Acompanhe oportunidades, responsáveis e próximos passos.', roles: ['OWNER', 'ADMIN', 'SALES'] },
  clientes: { title: 'Clientes', description: 'Dados de contato e histórico de relacionamento.', roles: ['OWNER', 'ADMIN', 'SALES'] },
  seo: { title: 'SEO', description: 'Diagnóstico técnico e Google Search Console.', roles: ['OWNER', 'ADMIN', 'MARKETING'] },
  configuracoes: { title: 'Configurações', description: 'Configurações administrativas e integrações.', roles: ['OWNER', 'ADMIN'] },
  formularios: { title: 'Formulários', description: 'Submissões recebidas e notificações por e-mail.', roles: ['OWNER','ADMIN','SALES'] },
  campanhas: { title: 'Campanhas', description: 'Campanhas e links de atribuição.', roles: ['OWNER','ADMIN','MARKETING'] },
  usuarios: { title: 'Usuários', description: 'Contas administrativas e permissões.', roles: ['OWNER'] },
  auditoria: { title: 'Auditoria', description: 'Histórico das operações administrativas.', roles: ['OWNER','ADMIN'] }
};
export function canAccess(role, module) { return Object.hasOwn(modules, module) && modules[module].roles.includes(role); }
export function cookieName(env = process.env) { return env.NODE_ENV === 'production' ? '__Host-marquesano_admin' : 'marquesano_admin'; }
export function cookieOptions(env = process.env) { return { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 28800 }; }
export function configured(env = process.env) {
  try { const u = new URL(env.ADMIN_SITE_ORIGIN); return isAbsolute(env.ADMIN_DATABASE_PATH || '') && !/(^|[\\/])public([\\/]|$)/i.test(env.ADMIN_DATABASE_PATH) && u.origin === env.ADMIN_SITE_ORIGIN && (u.protocol === 'https:' || (env.NODE_ENV !== 'production' && u.protocol === 'http:')); } catch { return false; }
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

export function createAdminStore(filename, now = Date.now) {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('OWNER','ADMIN','MARKETING','SALES','VIEWER')), active INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS login_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);`);
  migrate(db);
  function transaction(fn) { db.exec('BEGIN IMMEDIATE'); try { const result = fn(); db.exec('COMMIT'); return result; } catch (error) { db.exec('ROLLBACK'); throw error; } }
  return {
    repository: createRepository(db, now),
    close: () => db.close(),
    async createOwner(email, password) {
      email = email.trim().toLowerCase();
      if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) || email.length > 254) throw Error('E-mail inválido.');
      const hash = await hashPassword(password);
      transaction(() => {
        if (db.prepare('SELECT id FROM users LIMIT 1').get()) throw Error('O primeiro usuário já foi cadastrado.');
        db.prepare('INSERT INTO users (id,email,password_hash,role) VALUES (?,?,?,?)').run(randomBytes(16).toString('hex'), email, hash, 'OWNER');
      });
    },
    consumeLogin(email) {
      return transaction(() => {
        db.prepare('DELETE FROM login_limits WHERE expires <= ?').run(now());
        const keys = [['global', 100], [`email:${digest(email)}`, 5]];
        if (keys.some(([key, limit]) => (db.prepare('SELECT count FROM login_limits WHERE key=?').get(key)?.count || 0) >= limit)) return false;
        for (const [key] of keys) db.prepare('INSERT INTO login_limits VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').run(key, now() + 900000);
        return true;
      });
    },
    async authenticate(email, password) {
      const user = db.prepare('SELECT * FROM users WHERE email=? AND active=1').get(email);
      const valid = await verifyPassword(password, user?.password_hash || dummyHash);
      return valid && user ? { id: user.id, email: user.email, role: user.role } : null;
    },
    createSession(userId) {
      const token = randomBytes(32).toString('hex');
      db.prepare('DELETE FROM sessions WHERE expires <= ?').run(now());
      db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(digest(token), userId, now() + 28800000);
      return token;
    },
    getSession(token) {
      if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return null;
      const user = db.prepare('SELECT u.id,u.email,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1').get(digest(token), now());
      return user ? { id: user.id, email: user.email, role: user.role } : null;
    },
    revokeSession(token) { if (typeof token === 'string') db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(token)); }
  };
}

const storeKey = Symbol.for('marquesano.admin.store');
export function adminStore() {
  if (!configured()) throw Error('Admin não configurado.');
  if (globalThis[storeKey] && !globalThis[storeKey].repository?.meta) {
    globalThis[storeKey].close();
    delete globalThis[storeKey];
  }
  if (!globalThis[storeKey]) globalThis[storeKey] = createAdminStore(process.env.ADMIN_DATABASE_PATH);
  return globalThis[storeKey];
}
