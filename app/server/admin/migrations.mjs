export function migrate(db) {
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)');
  db.exec('BEGIN IMMEDIATE');
  try {
    if (!db.prepare('SELECT version FROM schema_migrations WHERE version=1').get()) {
      db.exec(`
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
        CREATE TABLE public_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);
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
      db.prepare('INSERT INTO schema_migrations VALUES (1,?)').run(new Date().toISOString());
    }
    if (!db.prepare('SELECT version FROM schema_migrations WHERE version=2').get()) {
      db.exec(`
        CREATE TABLE meta_connection (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL DEFAULT 0, app_id TEXT, token_ciphertext TEXT, expires_at INTEGER, profile_json TEXT, account_json TEXT, connected_at TEXT);
        INSERT INTO meta_connection(id,revision) VALUES(1,0);
        CREATE TABLE meta_oauth_states (state_hash TEXT PRIMARY KEY, browser_hash TEXT NOT NULL, session_hash TEXT NOT NULL REFERENCES sessions(token_hash) ON DELETE CASCADE, expires_at INTEGER NOT NULL, revision INTEGER NOT NULL);
        CREATE INDEX meta_oauth_expiry ON meta_oauth_states(expires_at);
      `);
      db.prepare('INSERT INTO schema_migrations VALUES (2,?)').run(new Date().toISOString());
    }
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
