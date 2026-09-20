import { createHash } from 'node:crypto';
export const digest=value=>createHash('sha256').update(value).digest('hex');

export function createMetaStore(db,now=Date.now) {
  const get=()=>db.prepare('SELECT * FROM meta_connection WHERE id=1').get();
  const session=hash=>db.prepare("SELECT u.id,u.email,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1 AND u.role IN ('OWNER','ADMIN')").get(hash,now());
  return {
    now,get,session,
    begin(state,browser,sessionToken) {
      const hash=digest(sessionToken);
      db.prepare('DELETE FROM meta_oauth_states WHERE expires_at<=? OR session_hash=?').run(now(),hash);
      db.prepare('INSERT INTO meta_oauth_states VALUES(?,?,?,?,?)').run(digest(state),digest(browser),hash,now()+600000,get().revision);
    },
    consume(state,browser) {
      const row=db.prepare('DELETE FROM meta_oauth_states WHERE state_hash=? AND browser_hash=? AND expires_at>? RETURNING *').get(digest(state),digest(browser),now());
      if(!row||row.revision!==get().revision)return null;
      const user=session(row.session_hash);
      return user?{...row,user}:null;
    },
    save(flow,{appId,ciphertext,expiresAt,profile}) {
      if(!session(flow.session_hash))return false;
      return db.prepare('UPDATE meta_connection SET revision=revision+1,app_id=?,token_ciphertext=?,expires_at=?,profile_json=?,account_json=NULL,connected_at=? WHERE id=1 AND revision=?').run(appId,ciphertext,expiresAt,JSON.stringify(profile),new Date(now()).toISOString(),flow.revision).changes===1;
    },
    select(account,revision) {return db.prepare('UPDATE meta_connection SET account_json=?,revision=revision+1 WHERE id=1 AND revision=? AND token_ciphertext IS NOT NULL').run(JSON.stringify(account),revision).changes===1;},
    clear(revision) {
      const changed=db.prepare('UPDATE meta_connection SET revision=revision+1,app_id=NULL,token_ciphertext=NULL,expires_at=NULL,profile_json=NULL,account_json=NULL,connected_at=NULL WHERE id=1 AND revision=?').run(revision).changes===1;
      if(changed)db.prepare('DELETE FROM meta_oauth_states').run();
      return changed;
    }
  };
}
