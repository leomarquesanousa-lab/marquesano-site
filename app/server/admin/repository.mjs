import { randomUUID, createHash } from 'node:crypto';
import { InputError, text, choice, email, phone, website, publicPath, leadStatuses, clientStatuses, campaignStatuses } from './validation.mjs';
import { createMetaStore } from './meta-store.mjs';
import { createPlanStore } from './plan-store.mjs';
import { createBillingStore } from './billing-store.mjs';

const plain = row => row ? { ...row } : null;
const parse = value => { try { return JSON.parse(value || '{}'); } catch { return {}; } };
const settingsKeys = ['GTM_CONTAINER_ID','GA4_MEASUREMENT_ID','GA4_PROPERTY_ID','GSC_SITE_URL','TRACKING_ENABLED'];
export function createRepository(db, now = Date.now) {
  const time = () => new Date(now()).toISOString();
  const one = (sql,...args) => plain(db.prepare(sql).get(...args));
  const all = (sql,...args) => db.prepare(sql).all(...args).map(plain);
  const run = (sql,...args) => db.prepare(sql).run(...args);
  function tx(fn) { db.exec('BEGIN IMMEDIATE'); try { const result=fn();db.exec('COMMIT');return result; } catch(error){db.exec('ROLLBACK');throw error;} }
  function audit(actor,action,entity,id) { run('INSERT INTO audit_log VALUES (?,?,?,?,?,?)',randomUUID(),actor?.id || null,action,entity,id,time()); }
  function requireRow(table,id) { const row=one(`SELECT * FROM ${table} WHERE id=?`,id); if(!row)throw new InputError('Registro não encontrado.',404);return row; }
  function company(name, existing) {
    name=text(name,200); if(!name)return null;
    if(existing){run('UPDATE companies SET name=? WHERE id=?',name,existing);return existing;}
    const id=randomUUID();run('INSERT INTO companies VALUES (?,?,?,?)',id,name,'',time());return id;
  }
  function owner(id) { if(!id)return null; if(!one("SELECT id FROM users WHERE id=? AND active=1 AND role IN ('OWNER','ADMIN','SALES')",id))throw new InputError('Responsável inválido.');return id; }
  function list(module,params,period) {
    const page=Number(params.get('page')||1), limit=25, offset=(page-1)*limit;
    if(!Number.isInteger(page)||page<1||page>10000)throw new InputError('Página inválida.');
    const q=text(params.get('q') || '',100), status=text(params.get('status') || '',30);
    const sort=params.get('sort')==='oldest'?'ASC':'DESC';
    const from=period.from, until=period.until;
    let rows,total;
    if(module==='leads'||module==='clientes') {
      const table=module==='leads'?'leads':'clients';
      const where="WHERE t.created_at>=? AND t.created_at<? AND (t.name LIKE ? OR t.email LIKE ? OR COALESCE(c.name,'') LIKE ?) AND (?='' OR t.status=?)";
      const args=[from,until,`%${q}%`,`%${q}%`,`%${q}%`,status,status];
      rows=all(`SELECT t.*,c.name AS company FROM ${table} t LEFT JOIN companies c ON c.id=t.company_id ${where} ORDER BY t.created_at ${sort},t.id LIMIT ? OFFSET ?`,...args,limit,offset);
      total=one(`SELECT count(*) AS n FROM ${table} t LEFT JOIN companies c ON c.id=t.company_id ${where}`,...args).n;
    } else if(module==='campanhas') {
      rows=all(`SELECT c.*,
        (SELECT count(DISTINCT visitor_id) FROM marketing_events e WHERE e.campaign=c.slug AND e.event='page_view' AND e.created_at>=? AND e.created_at<?) AS visits,
        (SELECT count(*) FROM leads l WHERE json_extract(l.last_touch,'$.utm_campaign')=c.slug AND l.created_at>=? AND l.created_at<?) AS leads,
        (SELECT count(*) FROM leads l WHERE json_extract(l.last_touch,'$.utm_campaign')=c.slug AND l.status='WON' AND l.created_at>=? AND l.created_at<?) AS conversions
        FROM campaigns c WHERE (c.name LIKE ? OR c.slug LIKE ?) AND (?='' OR c.status=?) ORDER BY c.created_at ${sort} LIMIT ? OFFSET ?`,from,until,from,until,from,until,`%${q}%`,`%${q}%`,status,status,limit,offset);
      total=one("SELECT count(*) AS n FROM campaigns WHERE (name LIKE ? OR slug LIKE ?) AND (?='' OR status=?)",`%${q}%`,`%${q}%`,status,status).n;
    } else if(module==='formularios') {
      rows=all(`SELECT s.*,l.name,l.email FROM form_submissions s JOIN leads l ON l.id=s.lead_id WHERE s.created_at>=? AND s.created_at<? AND (l.name LIKE ? OR l.email LIKE ?) ORDER BY s.created_at ${sort} LIMIT ? OFFSET ?`,from,until,`%${q}%`,`%${q}%`,limit,offset);
      total=one('SELECT count(*) AS n FROM form_submissions s JOIN leads l ON l.id=s.lead_id WHERE s.created_at>=? AND s.created_at<? AND (l.name LIKE ? OR l.email LIKE ?)',from,until,`%${q}%`,`%${q}%`).n;
    } else if(module==='auditoria') {
      const action=text(params.get('action')||'',40),entity=text(params.get('entity')||'',40);
      const where="WHERE a.created_at>=? AND a.created_at<? AND (?='' OR COALESCE(u.email,'Sistema') LIKE ?) AND (?='' OR a.action=?) AND (?='' OR a.entity=?)";
      const args=[from,until,q,`%${q}%`,action,action,entity,entity];
      rows=all(`SELECT a.*,u.email AS actor FROM audit_log a LEFT JOIN users u ON u.id=a.actor_id ${where} ORDER BY a.created_at DESC,a.id LIMIT ? OFFSET ?`,...args,limit,offset);
      total=one(`SELECT count(*) AS n FROM audit_log a LEFT JOIN users u ON u.id=a.actor_id ${where}`,...args).n;
    } else if(module==='usuarios') {
      rows=all("SELECT u.id,u.email,u.role,u.active,(SELECT max(a.created_at) FROM audit_log a WHERE a.actor_id=u.id AND a.action='login') AS last_login FROM users u ORDER BY u.email LIMIT ? OFFSET ?",limit,offset);total=one('SELECT count(*) AS n FROM users').n;
    } else throw new InputError('Módulo inválido.',404);
    return {rows,total,page,limit,...(module==='leads'?{owners:all("SELECT id,email FROM users WHERE active=1 AND role IN ('OWNER','ADMIN','SALES') ORDER BY email")}:{} )};
  }
  function detail(module,id) {
    if(module==='leads') {
      requireRow('leads',id);
      return {record:one('SELECT l.*,c.name AS company FROM leads l LEFT JOIN companies c ON c.id=l.company_id WHERE l.id=?',id),notes:all('SELECT n.*,u.email AS author FROM lead_notes n JOIN users u ON u.id=n.author_id WHERE n.lead_id=? ORDER BY n.created_at DESC',id),history:all('SELECT h.*,u.email AS actor FROM lead_status_history h LEFT JOIN users u ON u.id=h.actor_id WHERE h.lead_id=? ORDER BY h.created_at DESC',id),submissions:all('SELECT * FROM form_submissions WHERE lead_id=? ORDER BY created_at DESC',id),client:one('SELECT id,name FROM clients WHERE lead_id=?',id)};
    }
    if(module==='clientes') { requireRow('clients',id);const record=one('SELECT t.*,c.name AS company FROM clients t LEFT JOIN companies c ON c.id=t.company_id WHERE t.id=?',id);return {record,lead:record.lead_id?detail('leads',record.lead_id):null}; }
    if(module==='campanhas')return {record:requireRow('campaigns',id)};
    throw new InputError('Registro não encontrado.',404);
  }
  function save(module,data,actor,id) {
    return tx(() => {
      const created=!id; id=id||randomUUID();
      if(module==='leads') {
        const old=created?null:requireRow('leads',id);
        const status=choice(data.status||'NEW',leadStatuses);
        const values=[text(data.name,100,true),company(data.company,old?.company_id),email(data.email),phone(data.phone),phone(data.whatsapp),text(data.interest,100),text(data.message,4000),status,choice(data.priority||'NORMAL',['LOW','NORMAL','HIGH']),owner(data.owner_id),time()];
        if(created)run('INSERT INTO leads (name,company_id,email,phone,whatsapp,interest,message,status,priority,owner_id,updated_at,created_at,id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',...values,time(),id);
        else run('UPDATE leads SET name=?,company_id=?,email=?,phone=?,whatsapp=?,interest=?,message=?,status=?,priority=?,owner_id=?,updated_at=?,identity_key=NULL WHERE id=?',...values,id);
        if(!old||old.status!==status)run('INSERT INTO lead_status_history VALUES (?,?,?,?,?,?)',randomUUID(),id,actor.id,old?.status||null,status,time());
      } else if(module==='clientes') {
        const old=created?null:requireRow('clients',id);
        const values=[text(data.name,100,true),company(data.company,old?.company_id),email(data.email),phone(data.phone),phone(data.whatsapp),website(data.website),text(data.document,24),text(data.notes,4000),choice(data.status||'PROSPECT',clientStatuses),time()];
        if(created)run('INSERT INTO clients (name,company_id,email,phone,whatsapp,website,document,notes,status,updated_at,created_at,id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',...values,time(),id);
        else run('UPDATE clients SET name=?,company_id=?,email=?,phone=?,whatsapp=?,website=?,document=?,notes=?,status=?,updated_at=? WHERE id=?',...values,id);
      } else if(module==='campanhas') {
        if(!created)requireRow('campaigns',id);
        const slug=text(data.slug,100,true);if(!/^[a-z0-9_-]+$/.test(slug))throw new InputError('Slug: use letras minúsculas, números, hífen ou sublinhado.');
        if(one('SELECT id FROM campaigns WHERE slug=? AND id<>?',slug,id))throw new InputError('Slug já utilizado.',409);
        const start=text(data.starts_at,10),end=text(data.ends_at,10);
        for(const date of [start,end])if(date&&(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))))throw new InputError('Data inválida.');
        if(start&&end&&start>end)throw new InputError('O fim deve ser posterior ao início.');
        const values=[text(data.name,150,true),text(data.description,2000),text(data.channel,100),text(data.source,100,true),text(data.medium,100,true),slug,publicPath(data.landing_page),start,end,choice(data.status||'DRAFT',campaignStatuses),text(data.notes,4000),time()];
        if(created)run('INSERT INTO campaigns (name,description,channel,source,medium,slug,landing_page,starts_at,ends_at,status,notes,updated_at,created_at,id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',...values,time(),id);
        else run('UPDATE campaigns SET name=?,description=?,channel=?,source=?,medium=?,slug=?,landing_page=?,starts_at=?,ends_at=?,status=?,notes=?,updated_at=? WHERE id=?',...values,id);
      } else throw new InputError();
      audit(actor,created?'create':'update',module,id);return {id};
    });
  }
  return {
    list,detail,save,meta:createMetaStore(db,now),plans:createPlanStore(db,now),billing:createBillingStore(db,now),
    note(id,body,actor) { return tx(()=>{requireRow('leads',id);const noteId=randomUUID();run('INSERT INTO lead_notes VALUES (?,?,?,?,?)',noteId,id,actor.id,text(body,4000,true),time());audit(actor,'note','leads',id);return {id:noteId};}); },
    convert(id,actor) { return tx(()=>{const lead=requireRow('leads',id);if(lead.status!=='WON')throw new InputError('Somente leads ganhos podem virar clientes.');const existing=one('SELECT id FROM clients WHERE lead_id=?',id);if(existing)return existing;const clientId=randomUUID();run('INSERT INTO clients (id,lead_id,company_id,name,email,phone,whatsapp,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',clientId,id,lead.company_id,lead.name,lead.email,lead.phone,lead.whatsapp,'ACTIVE',time(),time());audit(actor,'convert','leads',id);return {id:clientId};}); },
    settings(env=process.env) { const saved=Object.fromEntries(all('SELECT key,value FROM settings').map(r=>[r.key,r.value]));return Object.fromEntries(settingsKeys.map(key=>[key,saved[key]??env[key]??(key==='TRACKING_ENABLED'?'false':'')])); },
    saveSettings(data,actor) { return tx(()=>{for(const key of Object.keys(data))if(!settingsKeys.includes(key))throw new InputError('Configuração não permitida.');
      const patterns={GTM_CONTAINER_ID:/^GTM-[A-Z0-9]{4,20}$/,GA4_MEASUREMENT_ID:/^G-[A-Z0-9]{4,20}$/,GA4_PROPERTY_ID:/^\d{1,20}$/,GSC_SITE_URL:/^(sc-domain:marquesano\.com\.br|https:\/\/(www\.)?marquesano\.com\.br\/)$/,TRACKING_ENABLED:/^(true|false)$/};
      for(const [key,value]of Object.entries(data)){const v=text(value,300);if(v&&!patterns[key].test(v))throw new InputError(`${key} inválido.`);run('INSERT INTO settings VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at',key,v,time());}
      audit(actor,'settings','configuracoes','tracking');return {ok:true};}); },
    audit,
    async saveUser(data,actor,id,hashPassword) {
      const address=email(data.email),role=choice(data.role,['OWNER','ADMIN','MARKETING','SALES','VIEWER']);
      if(typeof data.active!=='boolean')throw new InputError();
      let hash=null;if(data.password){try{hash=await hashPassword(data.password);}catch{throw new InputError('Use uma senha de 12 caracteres ou mais (máximo de 256 bytes).');}}
      return tx(()=>{const old=id?requireRow('users',id):null;
        if(old?.role==='OWNER'&&old.active&&(!data.active||role!=='OWNER')&&one("SELECT count(*) AS n FROM users WHERE role='OWNER' AND active=1").n<=1)throw new InputError('Não é possível remover o último OWNER ativo.',409);
        if(one('SELECT id FROM users WHERE email=? AND id<>?',address,id||''))throw new InputError('E-mail já cadastrado.',409);
        if(!old&&!hash)throw new InputError('Informe uma senha.');
        id=id||randomUUID();if(old){run('UPDATE users SET email=?,role=?,active=?,password_hash=? WHERE id=?',address,role,Number(data.active),hash||old.password_hash,id);run('DELETE FROM sessions WHERE user_id=?',id);}else run('INSERT INTO users (id,email,password_hash,role,active) VALUES (?,?,?,?,?)',id,address,hash,role,Number(data.active));
        audit(actor,old?'update':'create','usuarios',id);return {id};});
    },
    captureContact(clean,key,visitorId,fallback={}) { return tx(()=>{
      const previous=one('SELECT * FROM form_submissions WHERE idempotency_key=?',key);if(previous)return previous;
      const visitor=visitorId&&one('SELECT id FROM visitors WHERE id=?',visitorId);
      const attr=(visitor?one('SELECT * FROM utm_attribution WHERE visitor_id=?',visitorId):null)||{first_touch:JSON.stringify(fallback),last_touch:JSON.stringify(fallback)};
      const identity=createHash('sha256').update(JSON.stringify([clean.name.trim().toLowerCase(),clean.email.toLowerCase(),clean.phone.replace(/\D/g,'')])).digest('hex');
      let lead=one("SELECT id FROM leads WHERE identity_key=? AND status<>'ARCHIVED'",identity);
      if(!lead){lead={id:randomUUID()};const occupied=one('SELECT id FROM leads WHERE identity_key=?',identity);run('INSERT INTO leads (id,identity_key,name,email,phone,interest,message,visitor_id,first_touch,last_touch,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',lead.id,occupied?null:identity,clean.name,clean.email.toLowerCase(),clean.phone,clean.interest,clean.message,visitor?.id||null,attr?.first_touch||'{}',attr?.last_touch||'{}',time(),time());run('INSERT INTO lead_status_history VALUES (?,?,?,?,?,?)',randomUUID(),lead.id,null,null,'NEW',time());}
      else run('UPDATE leads SET last_touch=?,updated_at=? WHERE id=?',attr?.last_touch||'{}',time(),lead.id);
      const id=randomUUID();run('INSERT INTO form_submissions (id,idempotency_key,lead_id,message,created_at) VALUES (?,?,?,?,?)',id,key,lead.id,clean.message,time());
      const touch=parse(attr?.last_touch);run('INSERT INTO marketing_events VALUES (?,?,?,?,?,?,?,?)',randomUUID(),visitor?.id||null,'lead_generated',touch.landing_page||'/contato',touch.utm_source||'',touch.utm_medium||'',touch.utm_campaign||'',time());
      return one('SELECT * FROM form_submissions WHERE id=?',id);
    }); },
    emailStatus(id,status,providerId=null) { run('UPDATE form_submissions SET email_status=?,provider_id=? WHERE id=?',choice(status,['SENT','FAILED','UNKNOWN']),providerId,id); },
    recordEvent(visitorId,event,attribution) { return tx(()=>{
      const current=now();run('DELETE FROM public_limits WHERE expires<=?',current);
      const known=visitorId&&one('SELECT id FROM visitors WHERE id=?',visitorId);const id=known?.id||randomUUID();
      for(const [key,max] of [['global',3000],[`visitor:${id}`,120]]) {if((one('SELECT count FROM public_limits WHERE key=?',key)?.count||0)>=max)throw new InputError('Limite de eventos.',429);run('INSERT INTO public_limits VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1',key,current+60000);}
      run('INSERT INTO visitors VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET last_seen=excluded.last_seen',id,time(),time());
      const old=one('SELECT * FROM utm_attribution WHERE visitor_id=?',id);
      const touch={...attribution,at:time()};
      const hasCampaign=Boolean(touch.utm_source||touch.utm_campaign||touch.referrer);
      const last=!old||hasCampaign?JSON.stringify(touch):old.last_touch;
      run('INSERT INTO utm_attribution VALUES (?,?,?) ON CONFLICT(visitor_id) DO UPDATE SET last_touch=excluded.last_touch',id,JSON.stringify(touch),last);
      const source=parse(last);
      run('INSERT OR IGNORE INTO marketing_events VALUES (?,?,?,?,?,?,?,?)',event.id,id,event.name,event.path,source.utm_source||'',source.utm_medium||'',source.utm_campaign||'',time());
      return id;
    }); },
    report(period) {
      const args=[period.from,period.until];
      const counts=one(`SELECT count(*) AS leads,sum(status='NEW') AS new_leads,sum(status IN ('CONTACTED','QUALIFIED','PROPOSAL')) AS following,sum(status='WON') AS won FROM leads WHERE created_at>=? AND created_at<?`,...args);
      const visitors=one("SELECT count(DISTINCT visitor_id) AS visitors,count(*) AS page_views FROM marketing_events WHERE event='page_view' AND created_at>=? AND created_at<?",...args);
      const visitorCounts=Object.fromEntries([1,7,30].map(days=>[String(days),one("SELECT count(DISTINCT visitor_id) AS n FROM marketing_events WHERE event='page_view' AND created_at>=?",new Date(Date.parse(time().slice(0,10))-(days-1)*86400000).toISOString()).n]));
      return {period,counts:{...counts,...visitors,forms:one('SELECT count(*) AS n FROM form_submissions WHERE created_at>=? AND created_at<?',...args).n,active_clients:one("SELECT count(*) AS n FROM clients WHERE status='ACTIVE'").n,active_campaigns:one("SELECT count(*) AS n FROM campaigns WHERE status='ACTIVE'").n},visitorCounts,
        traffic:all("SELECT substr(created_at,1,10) AS day,count(DISTINCT visitor_id) AS visitors,count(*) AS views FROM marketing_events WHERE event='page_view' AND created_at>=? AND created_at<? GROUP BY day ORDER BY day",...args),
        sources:all("SELECT COALESCE(NULLIF(json_extract(last_touch,'$.utm_source'),''),'Direto / não informado') AS label,count(*) AS leads,sum(status='WON') AS won FROM leads WHERE created_at>=? AND created_at<? GROUP BY label ORDER BY leads DESC LIMIT 20",...args),
        campaigns:all("SELECT COALESCE(NULLIF(json_extract(last_touch,'$.utm_campaign'),''),'Sem campanha') AS label,count(*) AS leads,sum(status='WON') AS won FROM leads WHERE created_at>=? AND created_at<? GROUP BY label ORDER BY leads DESC LIMIT 20",...args),
        channels:all("SELECT COALESCE(NULLIF(json_extract(last_touch,'$.utm_medium'),''),'Não informado') AS label,count(*) AS leads,sum(status='WON') AS won FROM leads WHERE created_at>=? AND created_at<? GROUP BY label ORDER BY leads DESC LIMIT 20",...args),
        pages:all("SELECT path AS label,count(*) AS views FROM marketing_events WHERE event='page_view' AND created_at>=? AND created_at<? GROUP BY path ORDER BY views DESC LIMIT 20",...args),
        events:all('SELECT event AS label,count(*) AS total FROM marketing_events WHERE created_at>=? AND created_at<? GROUP BY event ORDER BY total DESC',...args),
        trend:all("SELECT substr(created_at,1,10) AS day,count(*) AS leads FROM leads WHERE created_at>=? AND created_at<? GROUP BY day ORDER BY day",...args)};
    }
  };
}
