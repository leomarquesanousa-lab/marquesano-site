import { createHash } from 'node:crypto';
export const digest = (value) => createHash('sha256').update(value).digest('hex');

export function createMetaStore(db, now = Date.now) {
  const get = async () => await db.prepare('SELECT * FROM meta_connection WHERE id=1').get();
  const session = async (hash) => await db.prepare("SELECT u.id,u.email,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1 AND u.role IN ('OWNER','ADMIN')").get(hash, now());
  const store = {
    now, get, session,
    async begin(state, browser, sessionToken) {
      const hash = digest(sessionToken);
      await db.prepare('DELETE FROM meta_oauth_states WHERE expires_at<=? OR session_hash=?').run(now(), hash);
      await db.prepare('INSERT INTO meta_oauth_states VALUES(?,?,?,?,?)').run(digest(state), digest(browser), hash, now() + 600000, (await get()).revision);
    },
    async consume(state, browser) {
      const row = await db.prepare('DELETE FROM meta_oauth_states WHERE state_hash=? AND browser_hash=? AND expires_at>? RETURNING *').get(digest(state), digest(browser), now());
      if (!row || row.revision !== (await get()).revision) return null;
      const user = await session(row.session_hash);
      return user ? { ...row, user } : null;
    },
    async save(flow, { appId, ciphertext, expiresAt, profile }) {
      if (!(await session(flow.session_hash))) return false;
      return (await db.prepare('UPDATE meta_connection SET revision=revision+1,app_id=?,token_ciphertext=?,expires_at=?,profile_json=?,account_json=NULL,connected_at=? WHERE id=1 AND revision=?').run(appId, ciphertext, expiresAt, JSON.stringify(profile), new Date(now()).toISOString(), flow.revision)).changes === 1;
    },
    async select(account, revision) {return (await db.prepare('UPDATE meta_connection SET account_json=?,revision=revision+1 WHERE id=1 AND revision=? AND token_ciphertext IS NOT NULL').run(JSON.stringify(account), revision)).changes === 1;},
    async clear(revision) {
      const changed = (await db.prepare('UPDATE meta_connection SET revision=revision+1,app_id=NULL,token_ciphertext=NULL,expires_at=NULL,profile_json=NULL,account_json=NULL,connected_at=NULL WHERE id=1 AND revision=?').run(revision)).changes === 1;
      if (changed) await db.prepare('DELETE FROM meta_oauth_states').run();
      return changed;
    }
  };
  for (const name of ['begin','consume','save','select','clear']) {
    const operation=store[name];
    store[name]=(...args)=>db.transaction(()=>operation(...args));
  }
  return store;
}
