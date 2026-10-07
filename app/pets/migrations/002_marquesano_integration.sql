-- Preserve legacy images. Abort rather than silently reassign an unmatched owner.
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pet_migrations WHERE version='002_marquesano_integration') THEN RETURN; END IF;
 IF to_regclass('pet_users') IS NOT NULL THEN
  IF EXISTS (SELECT 1 FROM pet_users p WHERE (EXISTS(SELECT 1 FROM pet_listings l WHERE l.user_id=p.id) OR EXISTS(SELECT 1 FROM pet_reports r WHERE r.user_id=p.id)) AND NOT EXISTS(SELECT 1 FROM users u WHERE lower(u.email)=lower(p.email))) THEN
   RAISE EXCEPTION 'Pets: vincule os respons?veis legados a contas Marquesano existentes antes de migrar.';
  END IF;
  ALTER TABLE pet_listings DROP CONSTRAINT IF EXISTS pet_listings_user_id_fkey;
  ALTER TABLE pet_reports DROP CONSTRAINT IF EXISTS pet_reports_user_id_fkey;
  UPDATE pet_listings l SET user_id=u.id FROM pet_users p JOIN users u ON lower(u.email)=lower(p.email) WHERE l.user_id=p.id;
  UPDATE pet_reports r SET user_id=u.id FROM pet_users p JOIN users u ON lower(u.email)=lower(p.email) WHERE r.user_id=p.id;
  ALTER TABLE pet_listings ADD CONSTRAINT pet_listings_user_id_fkey FOREIGN KEY(user_id) REFERENCES users(id);
  ALTER TABLE pet_reports ADD CONSTRAINT pet_reports_user_id_fkey FOREIGN KEY(user_id) REFERENCES users(id);
 END IF;
 ALTER TABLE pet_photos ALTER COLUMN data DROP NOT NULL;
 ALTER TABLE pet_photos ADD COLUMN IF NOT EXISTS storage_key TEXT;
 ALTER TABLE pet_listings ALTER COLUMN moderation SET DEFAULT 'aprovado';
 UPDATE pet_listings SET moderation='aprovado' WHERE moderation='pendente';
END $$;
