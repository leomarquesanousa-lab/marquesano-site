import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { InputError } from './validation.mjs';
const digest = value => createHash('sha256').update(value).digest('hex');
export async function migrateMetaAds(db) {
  await db.exec(`CREATE TABLE meta_campaign_drafts (
    id TEXT PRIMARY KEY, account_id TEXT NOT NULL, name TEXT NOT NULL, content TEXT NOT NULL,
    author_id TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE meta_creatives (
    id TEXT PRIMARY KEY, account_id TEXT NOT NULL, name TEXT NOT NULL, format TEXT NOT NULL,
    origin TEXT NOT NULL, content_hash TEXT NOT NULL, meta_hash TEXT, url TEXT, prompt TEXT,
    campaign_id TEXT, status TEXT NOT NULL, created_at TEXT NOT NULL,
    UNIQUE(account_id,content_hash));
    CREATE TABLE meta_campaign_snapshots (
    account_id TEXT PRIMARY KEY, content TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE meta_action_log (
    id TEXT PRIMARY KEY, actor_id TEXT NOT NULL REFERENCES users(id), account_id TEXT NOT NULL,
    action TEXT NOT NULL, resource_id TEXT, before_value TEXT, after_value TEXT NOT NULL,
    confirmation_hash TEXT UNIQUE NOT NULL, expires BIGINT NOT NULL,
    result TEXT NOT NULL, response TEXT, request_id TEXT, created_at TEXT NOT NULL);
    CREATE INDEX meta_actions_account_date ON meta_action_log(account_id,created_at);`);
}
export function createMetaAdsStore(db, now=Date.now) {
  const time=()=>new Date(now()).toISOString();
  return {
    async drafts(account) { return db.prepare('SELECT id,name,content,created_at,updated_at FROM meta_campaign_drafts WHERE account_id=? ORDER BY updated_at DESC LIMIT 100').all(account); },
    async saveDraft(account, data, actor, id=randomUUID()) {
      await db.transaction(async()=>{
        const row=await db.prepare('SELECT account_id FROM meta_campaign_drafts WHERE id=?').get(id);
        if(row&&row.account_id!==account)throw new InputError('Rascunho não encontrado.',404);
        await db.prepare('INSERT INTO meta_campaign_drafts VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,content=EXCLUDED.content,updated_at=EXCLUDED.updated_at').run(id,account,data.name,JSON.stringify(data),actor.id,time(),time());
        await db.prepare('INSERT INTO audit_log VALUES(?,?,?,?,?,?)').run(randomUUID(),actor.id,'meta_draft_saved','meta-ads',id,time());
      });return {id};
    },
    async snapshot(account,data) {await db.prepare('INSERT INTO meta_campaign_snapshots VALUES(?,?,?) ON CONFLICT(account_id) DO UPDATE SET content=EXCLUDED.content,updated_at=EXCLUDED.updated_at').run(account,JSON.stringify(data),time());},
    async history(account) {return db.prepare('SELECT id,actor_id,action,resource_id,before_value,after_value,result,response,request_id,created_at FROM meta_action_log WHERE account_id=? ORDER BY created_at DESC LIMIT 100').all(account);},
    async prepare(account,actor,action,resource,before,after) {
      const token=randomBytes(32).toString('hex'),id=randomUUID();
      await db.prepare('INSERT INTO meta_action_log(id,actor_id,account_id,action,resource_id,before_value,after_value,confirmation_hash,expires,result,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(id,actor.id,account,action,resource||null,JSON.stringify(before),JSON.stringify(after),digest(token),now()+600000,'REVIEW',time());
      return {confirmation:token,review:{account,action,resource,before,after},expiresAt:now()+600000};
    },
    async claim(account,actor,token) {return db.transaction(async()=>{
      if(!/^[a-f0-9]{64}$/.test(token||''))throw new InputError('Confirmação obrigatória.');
      const row=await db.prepare('SELECT * FROM meta_action_log WHERE confirmation_hash=? AND account_id=? AND actor_id=?').get(digest(token),account,actor.id);
      if(!row||row.expires<now()||row.result!=='REVIEW')throw new InputError('Confirmação expirada ou já utilizada. Consulte o histórico antes de repetir.',409);
      await db.prepare("UPDATE meta_action_log SET result='PROCESSING' WHERE id=?").run(row.id);
      return {...row,before:JSON.parse(row.before_value),after:JSON.parse(row.after_value)};
    });},
    async finish(row,result,response) {await db.transaction(async()=>{
      await db.prepare('UPDATE meta_action_log SET result=?,response=?,request_id=? WHERE id=?').run(result,JSON.stringify(response),response?.request_id||null,row.id);
      await db.prepare('INSERT INTO audit_log VALUES(?,?,?,?,?,?)').run(randomUUID(),row.actor_id,'meta_'+row.action+'_'+result.toLowerCase(),'meta-ads',row.resource_id||row.id,time());
    });},
    async images(account) {return db.prepare('SELECT * FROM meta_creatives WHERE account_id=? ORDER BY created_at DESC LIMIT 100').all(account);},
    async reserveImage(account,data) {return db.transaction(async()=>{
      const old=await db.prepare('SELECT * FROM meta_creatives WHERE account_id=? AND content_hash=?').get(account,data.hash);
      if(old)return {...old,existing:true};
      const id=randomUUID();await db.prepare('INSERT INTO meta_creatives(id,account_id,name,format,origin,content_hash,prompt,status,created_at) VALUES(?,?,?,?,?,?,?,?,?)').run(id,account,data.name,data.format,data.origin||'upload',data.hash,data.prompt||null,'PROCESSING',time());return {id};
    });},
    async finishImage(id,hash,url) {await db.prepare("UPDATE meta_creatives SET meta_hash=?,url=?,status='READY' WHERE id=?").run(hash,url,id);}
  };
}
