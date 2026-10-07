CREATE TABLE IF NOT EXISTS pet_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS pet_categories (
 slug TEXT PRIMARY KEY, name TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS pet_listings (
 id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, user_id TEXT NOT NULL REFERENCES users(id),
 situation TEXT NOT NULL CHECK(situation IN ('perdido','encontrado','adocao')),
 category TEXT NOT NULL REFERENCES pet_categories(slug), name TEXT NOT NULL DEFAULT '', title TEXT NOT NULL,
 description TEXT NOT NULL, city TEXT NOT NULL, city_slug TEXT NOT NULL, state TEXT NOT NULL,
 neighborhood TEXT NOT NULL, location_hint TEXT NOT NULL DEFAULT '', event_date TEXT NOT NULL,
 sex TEXT NOT NULL, size TEXT NOT NULL, color TEXT NOT NULL, breed TEXT NOT NULL DEFAULT '',
 age TEXT NOT NULL DEFAULT '', features TEXT NOT NULL DEFAULT '', contact_name TEXT NOT NULL,
 contact_phone TEXT NOT NULL DEFAULT '', whatsapp TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'ativo' CHECK(status IN ('ativo','reencontrado','adotado','resolvido')),
 moderation TEXT NOT NULL DEFAULT 'aprovado' CHECK(moderation IN ('pendente','aprovado','oculto')),
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS pet_photos (
 id TEXT PRIMARY KEY, listing_id TEXT NOT NULL REFERENCES pet_listings(id) ON DELETE CASCADE,
 position INTEGER NOT NULL, mime TEXT NOT NULL, data TEXT NOT NULL, UNIQUE(listing_id,position)
);
CREATE TABLE IF NOT EXISTS pet_reports (
 id TEXT PRIMARY KEY, listing_id TEXT NOT NULL REFERENCES pet_listings(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id), reason TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'aberta' CHECK(status IN ('aberta','revisada')), created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS pet_articles (
 slug TEXT PRIMARY KEY, title TEXT NOT NULL, excerpt TEXT NOT NULL, body TEXT NOT NULL,
 published INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS pet_rate_limits (
 key TEXT PRIMARY KEY, attempts INTEGER NOT NULL DEFAULT 0, reset_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS pet_listing_search ON pet_listings(moderation,status,situation,state,city_slug,category,created_at);
CREATE INDEX IF NOT EXISTS pet_listing_owner ON pet_listings(user_id,created_at);

CREATE INDEX IF NOT EXISTS pet_reports_status ON pet_reports(status,created_at);
