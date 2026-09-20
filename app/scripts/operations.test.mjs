import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID,generateKeyPairSync } from 'node:crypto';
import { createAdminStore, hashPassword } from '../server/admin/core.mjs';
import { operations } from '../server/admin/operations.mjs';
import { range } from '../server/admin/validation.mjs';
import { googleReport, testGoogleConnection } from '../server/admin/google.mjs';
import { attribution } from '../server/marketing.mjs';
import { createContactHandler } from '../server/contact.mjs';
import { publicPages,seoDiagnostics } from '../server/seo.mjs';
import { DatabaseSync } from 'node:sqlite';
import { migrate } from '../server/admin/migrations.mjs';

const fields={name:'Pessoa de teste',email:'person@example.com',phone:'11999999999',interest:'Site',message:'Solicitação de teste do CRM.'};
const period=()=>range(new URLSearchParams());
async function setup() {const store=createAdminStore(':memory:');await store.createOwner('owner@example.com','test-password-long-123');const actor=await store.authenticate('owner@example.com','test-password-long-123');return {store,repo:store.repository,actor};}
test('migration upgrades the original schema twice without replacing users or sessions',()=>{
  const db=new DatabaseSync(':memory:');try{
    db.exec("PRAGMA foreign_keys=ON;CREATE TABLE users(id TEXT PRIMARY KEY,email TEXT,password_hash TEXT,role TEXT,active INTEGER);CREATE TABLE sessions(token_hash TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),expires INTEGER);CREATE TABLE login_limits(key TEXT PRIMARY KEY,count INTEGER,expires INTEGER);INSERT INTO users VALUES('old-owner','owner@example.com','existing-hash','OWNER',1);INSERT INTO sessions VALUES('old-session','old-owner',9999999999999)");
    migrate(db);migrate(db);assert.equal(db.prepare('SELECT count(*) AS n FROM schema_migrations').get().n,2);assert.equal(db.prepare('SELECT password_hash FROM users').get().password_hash,'existing-hash');assert.equal(db.prepare('SELECT user_id FROM sessions').get().user_id,'old-owner');
  }finally{db.close();}
});
test('CRM preserves submissions, deduplicates retries, does not merge different identities',async()=>{
  const {store,repo,actor}=await setup();try{
    const first=repo.captureContact(fields,'request-1',null);assert.equal(repo.captureContact(fields,'request-1',null).id,first.id);
    const repeat=repo.captureContact({...fields,message:'Uma segunda mensagem real.'},'request-2',null);assert.equal(repeat.lead_id,first.lead_id);
    const other=repo.captureContact({...fields,phone:'11888888888'},'request-3',null);assert.notEqual(other.lead_id,first.lead_id);
    assert.equal(repo.report(period()).counts.leads,2);assert.equal(repo.report(period()).counts.forms,3);
    assert.throws(()=>repo.convert(first.lead_id,actor));
    const lead=repo.detail('leads',first.lead_id).record;
    repo.save('leads',{...lead,status:'WON'},actor,lead.id);repo.note(lead.id,'Proposta aprovada.',actor);
    const client=repo.convert(lead.id,actor);assert.equal(repo.convert(lead.id,actor).id,client.id);
    assert.equal(repo.detail('clientes',client.id).record.lead_id,lead.id);
    assert.equal(repo.detail('leads',lead.id).history.length,2);
    assert.equal(repo.detail('leads',lead.id).notes.length,1);
    repo.save('leads',{...lead,status:'ARCHIVED'},actor,lead.id);assert.equal(repo.detail('leads',lead.id).record.status,'ARCHIVED');
    repo.save('leads',{...lead,status:'CONTACTED'},actor,lead.id);assert.equal(repo.detail('leads',lead.id).record.status,'CONTACTED');
    assert.throws(()=>repo.save('leads',{...lead,owner_id:'missing',company:'Should roll back'},actor,lead.id));
    assert.equal(repo.detail('leads',lead.id).record.company,null);
  }finally{store.close();}
});
test('attribution, first/last touch, real campaign counts and settings validation',async()=>{
  const {store,repo,actor}=await setup();try{
    const clean=attribution({utm_source:'instagram',utm_campaign:'launch',landing_page:'/planos',referrer:'https://external.example/path?email=private'});
    assert.equal(clean.referrer,'https://external.example');
    const event={id:randomUUID(),name:'page_view',path:'/planos'};
    const visitor=repo.recordEvent(null,event,clean);repo.recordEvent(visitor,event,clean);
    repo.recordEvent(visitor,{...event,id:randomUUID()},attribution({utm_source:'google',utm_campaign:'launch',landing_page:'/'}));
    const submission=repo.captureContact(fields,'source-test',visitor);
    const lead=repo.detail('leads',submission.lead_id).record;
    assert.equal(JSON.parse(lead.first_touch).utm_source,'instagram');assert.equal(JSON.parse(lead.last_touch).utm_source,'google');
    const campaign={name:'Lançamento',source:'instagram',medium:'paid_social',slug:'launch',status:'ACTIVE',landing_page:'/planos'};
    repo.save('campanhas',campaign,actor);
    const list=repo.list('campanhas',new URLSearchParams(),period());assert.equal(list.rows[0].visits,1);assert.equal(list.rows[0].leads,1);
    assert.equal(repo.report(period()).counts.page_views,2);
    assert.throws(()=>repo.save('campanhas',{...campaign,slug:'another',landing_page:'https://evil.example'},actor));
    assert.throws(()=>repo.saveSettings({GOOGLE_PRIVATE_KEY:'never'},actor));
    assert.throws(()=>repo.saveSettings({GTM_CONTAINER_ID:'bad<script>'},actor));
    repo.saveSettings({TRACKING_ENABLED:'true',GTM_CONTAINER_ID:'GTM-ABCDE'},actor);assert.equal(repo.settings().GTM_CONTAINER_ID,'GTM-ABCDE');
    assert.throws(()=>range(new URLSearchParams('end=invalid')));
  }finally{store.close();}
});
test('user management preserves last owner, hashes passwords and revokes sessions',async()=>{
  const {store,repo,actor}=await setup();try{
    await assert.rejects(repo.saveUser({...actor,role:'ADMIN',active:true},actor,actor.id,hashPassword));
    const created=await repo.saveUser({email:'sales@example.com',role:'SALES',active:true,password:'test-sales-password-123'},actor,null,hashPassword);
    const token=store.createSession(created.id);assert(store.getSession(token));
    await repo.saveUser({email:'sales@example.com',role:'VIEWER',active:false},actor,created.id,hashPassword);assert.equal(store.getSession(token),null);
    const rows=repo.list('usuarios',new URLSearchParams(),period()).rows;assert(rows.every(row=>!('password_hash'in row)));
    const view={id:created.id,role:'VIEWER'};
    await assert.rejects(operations(new Request('https://marquesano.com.br/api/admin/clientes',{method:'POST'}),['clientes'],view,repo),e=>e.status===403);
    await assert.rejects(operations(new Request('https://marquesano.com.br/api/admin/configuracoes',{method:'PATCH'}),['configuracoes'],{...view,role:'MARKETING'},repo),e=>e.status===403);
  }finally{store.close();}
});
test('contact saves before sending, preserves provider notification and retries without duplicate submission',async()=>{
  const {store,repo}=await setup();try{
    let time=Date.now(),calls=0,fail=true;
    const env={RESEND_API_KEY:'test-only',CONTACT_TO_EMAIL:'owner@example.com',CONTACT_FROM_EMAIL:'site@example.com',CONTACT_FORM_SECRET:'a'.repeat(40),NODE_ENV:'production'};
    const handle=createContactHandler({env,now:()=>time,persistence:{capture:(data,key)=>repo.captureContact(data,key,null),sent:(r,id)=>repo.emailStatus(r.id,'SENT',id),failed:r=>repo.emailStatus(r.id,'FAILED')},fetcher:async()=>{calls++;assert.equal(repo.report(period()).counts.forms,1);return fail?Response.json({error:'test'},{status:503}):Response.json({id:'provider-test'});}});
    const token=(await(await handle(new Request('https://marquesano.com.br/api/contato'))).json()).token;time+=2000;
    const request=()=>new Request('https://marquesano.com.br/api/contato',{method:'POST',headers:{Origin:'https://marquesano.com.br','Content-Type':'application/json'},body:JSON.stringify({...fields,token})});
    assert.equal((await handle(request())).status,502);fail=false;assert.equal((await handle(request())).status,200);assert.equal((await handle(request())).status,200);
    assert.equal(calls,2);assert.equal(repo.report(period()).counts.forms,1);assert.equal(repo.list('formularios',new URLSearchParams(),period()).rows[0].email_status,'SENT');
  }finally{store.close();}
});
test('Google adapters use official APIs and never return credentials or fabricated rows',async()=>{
  const result=await googleReport('ga4',{},period(),{env:{}});assert.equal(result.status,'Não configurado');assert.equal(result.reports,null);
  const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}});
  const env={GOOGLE_CLIENT_EMAIL:'service@example.iam.gserviceaccount.com',GOOGLE_PRIVATE_KEY:privateKey};let calls=0;
  const fetcher=async(url)=>{calls++;if(url==='https://oauth2.googleapis.com/token')return Response.json({access_token:'test-token',expires_in:3600});assert(url.startsWith('https://analyticsdata.googleapis.com/')||url.startsWith('https://www.googleapis.com/webmasters/'));return Response.json({rows:[]});};
  const connected=await googleReport('ga4',{GA4_PROPERTY_ID:'123'},period(),{env,fetcher});assert.equal(connected.status,'Ativo');assert.equal(connected.reports.summary.rows.length,0);assert(calls>=7);assert(!JSON.stringify(connected).includes(privateKey));
  const denied=await googleReport('gsc',{GSC_SITE_URL:'sc-domain:marquesano.com.br'},period(),{env,fetcher:async()=>Response.json({error:'secret'},{status:403})});assert.equal(denied.status,'Erro de autenticação');assert(!JSON.stringify(denied).includes('secret'));
});
test('integration connection tests reuse Google reports and return safe status messages',async()=>{
  const missing=await testGoogleConnection('ga4',{},period(),{env:{}});
  assert.equal(missing.ok,false);assert.equal(missing.status,'Não conectado');
  const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}});
  const env={GOOGLE_CLIENT_EMAIL:'connection-test@example.com',GOOGLE_PRIVATE_KEY:privateKey};
  const settings={GA4_PROPERTY_ID:'123',GSC_SITE_URL:'sc-domain:marquesano.com.br'};
  const fetcher=async url=>url.includes('oauth2.googleapis.com')?Response.json({access_token:'test-connection-token'}):Response.json({rows:[]});
  for(const provider of ['ga4','gsc']) {
    const result=await testGoogleConnection(provider,settings,period(),{env,fetcher});
    assert.deepEqual(result,{ok:true,status:'Conectado',message:provider==='ga4'?'Google Analytics conectado com sucesso':'Search Console conectado com sucesso'});
    for(const code of [403,404,429,503]) {
      const denied=await testGoogleConnection(provider,settings,period(),{env,fetcher:async()=>Response.json({error:'private-provider-detail'},{status:code})});
      assert.equal(denied.ok,false);assert.equal(denied.status,'Erro');assert(denied.message);
      assert(!JSON.stringify(denied).includes('private-provider-detail'));assert(!JSON.stringify(denied).includes(privateKey));assert(!JSON.stringify(denied).includes('test-connection-token'));
    }
  }
});
test('integration test routes require settings permissions and do not save settings',async()=>{
  const repository={settings:()=>({})};
  const request=method=>new Request('https://marquesano.com.br/api/admin/configuracoes/ga4/test',{method,headers:{'Content-Type':'application/json'},body:JSON.stringify({})});
  for(const provider of ['ga4','gsc']) {
    for(const role of ['OWNER','ADMIN']) {
      const result=await operations(request('POST'),['configuracoes',provider,'test'],{role},repository);
      assert.equal(result.ok,false);assert.equal(result.status,'Não conectado');
    }
    for(const role of ['MARKETING','SALES','VIEWER'])await assert.rejects(operations(request('POST'),['configuracoes',provider,'test'],{role},repository),e=>e.status===403);
  }
  await assert.rejects(operations(request('PATCH'),['configuracoes','ga4','test'],{role:'OWNER'},repository),e=>e.status===405);
  await assert.rejects(operations(request('POST'),['configuracoes','unknown','test'],{role:'OWNER'},repository),e=>e.status===405);
});
test('SEO discovers public pages and excludes admin/API',()=>{
  const pages=publicPages();assert(pages.length>=12);assert(pages.every(p=>!p.path.startsWith('/admin')&&!p.path.startsWith('/api')));assert(pages.some(p=>p.path==='/'));
  const report=seoDiagnostics();assert.equal(report.missingTitle,0);assert.equal(report.missingDescription,0);assert.equal(report.missingCanonical,0);
});
