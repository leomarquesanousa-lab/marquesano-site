import { migrateMetaAds } from './meta-ads-store.mjs';
import { migratePlans, ensurePlans } from './plan-store.mjs';
import { migrateBilling } from './billing-store.mjs';
import { migrateSales } from './sales-migration.mjs';
export async function migrate(db) {
  return db.transaction(async () => {
    await db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version BIGINT PRIMARY KEY, applied_at TEXT NOT NULL)');
    if (!(await db.prepare('SELECT version FROM schema_migrations WHERE version=1').get())) {
      await db.exec(`
        CREATE TABLE companies (id TEXT PRIMARY KEY, name TEXT NOT NULL, document TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
        CREATE TABLE visitors (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, last_seen TEXT NOT NULL);
        CREATE TABLE utm_attribution (visitor_id TEXT PRIMARY KEY REFERENCES visitors(id), first_touch TEXT NOT NULL, last_touch TEXT NOT NULL);
        CREATE TABLE leads (id TEXT PRIMARY KEY, identity_key TEXT UNIQUE, name TEXT NOT NULL, company_id TEXT REFERENCES companies(id), email TEXT NOT NULL, phone TEXT NOT NULL, whatsapp TEXT NOT NULL DEFAULT '', interest TEXT NOT NULL DEFAULT '', message TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'NEW', priority TEXT NOT NULL DEFAULT 'NORMAL', owner_id TEXT REFERENCES users(id), visitor_id TEXT REFERENCES visitors(id), first_touch TEXT NOT NULL DEFAULT '{}', last_touch TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
        CREATE TABLE form_submissions (id TEXT PRIMARY KEY, idempotency_key TEXT UNIQUE NOT NULL, lead_id TEXT NOT NULL REFERENCES leads(id), form_name TEXT NOT NULL DEFAULT 'contato', message TEXT NOT NULL, email_status TEXT NOT NULL DEFAULT 'PENDING', provider_id TEXT, created_at TEXT NOT NULL);
        CREATE TABLE lead_notes (id TEXT PRIMARY KEY, lead_id TEXT NOT NULL REFERENCES leads(id), author_id TEXT NOT NULL REFERENCES users(id), body TEXT NOT NULL, created_at TEXT NOT NULL);
        CREATE TABLE lead_status_history (id TEXT PRIMARY KEY, lead_id TEXT NOT NULL REFERENCES leads(id), actor_id TEXT REFERENCES users(id), old_status TEXT, new_status TEXT NOT NULL, created_at TEXT NOT NULL);
        CREATE TABLE clients (id TEXT PRIMARY KEY, lead_id TEXT UNIQUE REFERENCES leads(id), company_id TEXT REFERENCES companies(id), name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '', whatsapp TEXT NOT NULL DEFAULT '', website TEXT NOT NULL DEFAULT '', document TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'PROSPECT', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
        CREATE TABLE campaigns (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', channel TEXT NOT NULL DEFAULT '', source TEXT NOT NULL, medium TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, landing_page TEXT NOT NULL DEFAULT '/', starts_at TEXT NOT NULL DEFAULT '', ends_at TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'DRAFT', notes TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
        CREATE TABLE marketing_events (id TEXT PRIMARY KEY, visitor_id TEXT REFERENCES visitors(id), event TEXT NOT NULL, path TEXT NOT NULL, source TEXT NOT NULL DEFAULT '', medium TEXT NOT NULL DEFAULT '', campaign TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
        CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);
        CREATE TABLE audit_log (id TEXT PRIMARY KEY, actor_id TEXT REFERENCES users(id), action TEXT NOT NULL, entity TEXT NOT NULL, entity_id TEXT NOT NULL, created_at TEXT NOT NULL);
        CREATE TABLE public_limits (key TEXT PRIMARY KEY, count BIGINT NOT NULL, expires BIGINT NOT NULL);
        CREATE INDEX lead_status_date ON leads(status,created_at);
        CREATE INDEX lead_owner ON leads(owner_id);
        CREATE INDEX submissions_date ON form_submissions(created_at);
        CREATE INDEX notes_lead_date ON lead_notes(lead_id,created_at);
        CREATE INDEX history_lead_date ON lead_status_history(lead_id,created_at);
        CREATE INDEX events_date_type ON marketing_events(created_at,event);
        CREATE INDEX events_visitor ON marketing_events(visitor_id,created_at);
        CREATE INDEX events_campaign ON marketing_events(campaign,created_at);
        CREATE INDEX clients_status ON clients(status);
        CREATE INDEX audit_date ON audit_log(created_at);
        CREATE INDEX sessions_expiry ON sessions(expires);
      `);
      await db.prepare('INSERT INTO schema_migrations VALUES (1,?)').run(new Date().toISOString());
    }
    if (!(await db.prepare('SELECT version FROM schema_migrations WHERE version=2').get())) {
      await db.exec(`
        CREATE TABLE meta_connection (id BIGINT PRIMARY KEY CHECK(id=1), revision BIGINT NOT NULL DEFAULT 0, app_id TEXT, token_ciphertext TEXT, expires_at BIGINT, profile_json TEXT, account_json TEXT, connected_at TEXT);
        INSERT INTO meta_connection(id,revision) VALUES(1,0);
        CREATE TABLE meta_oauth_states (state_hash TEXT PRIMARY KEY, browser_hash TEXT NOT NULL, session_hash TEXT NOT NULL REFERENCES sessions(token_hash) ON DELETE CASCADE, expires_at BIGINT NOT NULL, revision BIGINT NOT NULL);
        CREATE INDEX meta_oauth_expiry ON meta_oauth_states(expires_at);
      `);
      await db.prepare('INSERT INTO schema_migrations VALUES (2,?)').run(new Date().toISOString());
    }
    if (!(await db.prepare('SELECT version FROM schema_migrations WHERE version=3').get())) {
      await migratePlans(db);
      await db.prepare('INSERT INTO schema_migrations VALUES (3,?)').run(new Date().toISOString());
    }
    if (!(await db.prepare('SELECT version FROM schema_migrations WHERE version=4').get())) {
      await migrateBilling(db);
      await db.prepare('INSERT INTO schema_migrations VALUES (4,?)').run(new Date().toISOString());
    }
    if (!(await db.prepare('SELECT version FROM schema_migrations WHERE version=5').get())) {
      await db.exec(`CREATE TABLE checkout_attempts (
        id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, plan_code TEXT NOT NULL,
        amount_cents BIGINT NOT NULL, state TEXT NOT NULL, created_at BIGINT NOT NULL,
        terms_version TEXT NOT NULL, subscription_id TEXT REFERENCES mp_subscriptions(id));
        CREATE UNIQUE INDEX checkout_active_attempt ON checkout_attempts(fingerprint) WHERE state IN ('pending','unknown','authorized');`);
      await db.prepare('INSERT INTO schema_migrations VALUES (5,?)').run(new Date().toISOString());
    }
    if (!(await db.prepare('SELECT version FROM schema_migrations WHERE version=6').get())) {
      await ensurePlans(db);
      await db.prepare('INSERT INTO schema_migrations VALUES (6,?)').run(new Date().toISOString());
    }
    if (!(await db.prepare('SELECT version FROM schema_migrations WHERE version=7').get())) {
      await migrateSales(db);
      await db.prepare('INSERT INTO schema_migrations VALUES (7,?)').run(new Date().toISOString());
    }
    if (!(await db.prepare('SELECT version FROM schema_migrations WHERE version=8').get())) {
      await db.exec(`ALTER TABLE users ADD COLUMN name TEXT NOT NULL DEFAULT '';
        ALTER TABLE users ADD COLUMN created_at TEXT;
        ALTER TABLE users ALTER COLUMN created_at SET DEFAULT to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
        ALTER TABLE users ADD COLUMN deleted_at TEXT;
        CREATE UNIQUE INDEX users_email_case_insensitive ON users(lower(email));`);
      await db.prepare('INSERT INTO schema_migrations VALUES(8,?)').run(new Date().toISOString());
    }
    if (!(await db.prepare('SELECT version FROM schema_migrations WHERE version=9').get())) {
      await migrateMetaAds(db);
      await db.prepare('INSERT INTO schema_migrations VALUES(9,?)').run(new Date().toISOString());
    }
  });
}
