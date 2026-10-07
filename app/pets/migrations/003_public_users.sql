CREATE TABLE IF NOT EXISTS pet_public_users (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
 password_hash TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS pet_public_sessions (
 token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES pet_public_users(id) ON DELETE CASCADE,
 expires BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS pet_public_session_expiry ON pet_public_sessions(expires);
ALTER TABLE pet_listings ADD COLUMN IF NOT EXISTS public_user_id TEXT REFERENCES pet_public_users(id);
ALTER TABLE pet_reports ADD COLUMN IF NOT EXISTS public_user_id TEXT REFERENCES pet_public_users(id);
ALTER TABLE pet_listings ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE pet_reports ALTER COLUMN user_id DROP NOT NULL;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pet_migrations WHERE version='003_public_users') THEN
  ALTER TABLE pet_listings ADD CONSTRAINT pet_listing_exactly_one_owner CHECK ((user_id IS NULL) <> (public_user_id IS NULL));
  ALTER TABLE pet_reports ADD CONSTRAINT pet_report_exactly_one_author CHECK ((user_id IS NULL) <> (public_user_id IS NULL));
  INSERT INTO pet_migrations(version,applied_at) VALUES('003_public_users',CURRENT_TIMESTAMP::TEXT);
 END IF;
END $$;
CREATE INDEX IF NOT EXISTS pet_listing_public_owner ON pet_listings(public_user_id,created_at);
