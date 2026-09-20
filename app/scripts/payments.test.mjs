import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server.js';
import { createAdminStore, cookieName } from '../server/admin/core.mjs';
import { syncPlan, startCheckout, checkoutUrl } from '../server/admin/mercadopago.mjs';
import { handleAdminApi } from '../server/admin/api.mjs';

const env={NODE_ENV:'production',ADMIN_SITE_ORIGIN:'https://marquesano.com.br',ADMIN_DATABASE_PATH:process.cwd()+'/.admin-data/unused-test.sqlite',MERCADOPAGO_ACCESS_TOKEN:'test-secret-not-real'};
function fixture(t) {
  const store=createAdminStore(':memory:');t.after(()=>store.close());
  const plans=store.repository.plans,calls=[],remote=new Map();
  const fetcher=async(url,options)=>{
    assert.equal(options.headers.Authorization,'Bearer '+env.MERCADOPAGO_ACCESS_TOKEN);
    assert(url.startsWith('https://api.mercadopago.com/preapproval_plan'));
    calls.push({url,...options});const method=options.method;
    let id=url.split('/').pop();
    if(method==='POST')id='mp_plan_'+(remote.size+1);
    if(method==='POST'||method==='PUT')remote.set(id,{...JSON.parse(options.body),id,status:JSON.parse(options.body).status||'active',init_point:'https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id='+id});
    return {ok:true,json:async()=>remote.get(id)};
  };
  return {store,plans,calls,remote,options:{env,fetcher}};
}
const edit=(plans,id,changes)=>plans.save(id,{...plans.get(id),...changes});

test('three stable plans; only existing entry price seeded; validation and revision checks',t=>{
  const {plans}=fixture(t);
  assert.deepEqual(plans.list().map(p=>[p.id,p.monthly_price_cents]),[['basico',9900],['intermediario',null],['professional',null]]);
  assert.throws(()=>edit(plans,'intermediario',{active:true}));
  for(const price of [-1,0,1.5,'99',NaN])assert.throws(()=>edit(plans,'basico',{monthly_price_cents:price}));
  assert.throws(()=>edit(plans,'basico',{cycles:0}));
  const stale=plans.get('basico');edit(plans,'basico',{cycles:6});assert.throws(()=>plans.save('basico',stale),/mudou/);
  assert.throws(()=>plans.get('unknown'));
});

test('independent creation, stored provider IDs, repeat sync updates only selected plan, correct checkout',async t=>{
  const {plans,calls,options}=fixture(t);
  // Arbitrary fixture amounts only; not production defaults.
  edit(plans,'intermediario',{monthly_price_cents:12345,cycles:6,active:true});
  edit(plans,'professional',{monthly_price_cents:45678,cycles:18,active:true});
  for(const id of ['basico','intermediario','professional'])await syncPlan(plans,id,options);
  assert.equal(new Set(plans.list().map(p=>p.mercadopago_plan_id)).size,3);
  assert.deepEqual(calls.filter(c=>c.method==='POST').map(c=>JSON.parse(c.body).auto_recurring.transaction_amount),[99,123.45,456.78]);
  const basicBefore=plans.get('basico');
  edit(plans,'intermediario',{monthly_price_cents:20001});await syncPlan(plans,'intermediario',options);
  assert.deepEqual(plans.get('basico'),basicBefore);
  assert.equal(calls.filter(c=>c.method==='POST').length,3);
  assert.equal(calls.filter(c=>c.method==='PUT').length,1);
  for(const plan of plans.list())assert.equal(new URL(await startCheckout(plans,plan.id,plan.revision,options)).searchParams.get('preapproval_plan_id'),plan.mercadopago_plan_id);
});

test('unconfigured, unsynced, inactive and stale plans never reach checkout',async t=>{
  const {plans,options,calls}=fixture(t);
  await assert.rejects(syncPlan(plans,'basico',{env:{}}),/ACCESS_TOKEN/);
  await assert.rejects(syncPlan(plans,'intermediario',options),/preço/);
  await assert.rejects(startCheckout(plans,'basico',1,options));assert.equal(calls.length,0);
  await syncPlan(plans,'basico',options);
  await assert.rejects(startCheckout(plans,'basico',999,options),/mudaram/);
  edit(plans,'basico',{active:false});await assert.rejects(startCheckout(plans,'basico',plans.get('basico').revision,options));
  await syncPlan(plans,'basico',options);assert.equal(JSON.parse(calls.findLast(c=>c.method==='PUT').body).status,'inactive');
});

test('checkout rejects remote price/cycle/currency drift and unsafe redirect',async t=>{
  const {plans,options,remote}=fixture(t);await syncPlan(plans,'basico',options);const p=plans.get('basico'),original=structuredClone(remote.get(p.mercadopago_plan_id));
  for(const change of [{transaction_amount:1},{currency_id:'USD'},{frequency:2},{repetitions:999},{free_trial:{frequency:1}},{billing_day_proportional:true}]) {
    remote.set(p.mercadopago_plan_id,{...original,auto_recurring:{...original.auto_recurring,...change}});
    await assert.rejects(startCheckout(plans,p.id,p.revision,options),/difere/);
  }
  for(const url of ['https://evil.example/subscriptions/checkout?preapproval_plan_id=x','javascript:alert(1)','https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=other'])assert.throws(()=>checkoutUrl({id:'x',init_point:url}));
});

test('ambiguous create cannot be retried as a new POST; explicit linking permits recovery',async t=>{
  const {plans,options}=fixture(t);let calls=0;
  const fail={env,fetcher:async()=>{calls++;throw Error('private-token-provider-message');}};
  await assert.rejects(syncPlan(plans,'basico',fail),e=>!e.message.includes('private-token'));
  await assert.rejects(syncPlan(plans,'basico',fail),/sem confirmação/);assert.equal(calls,1);
  edit(plans,'basico',{description:'Edited after timeout'});
  await assert.rejects(syncPlan(plans,'basico',fail),/sem confirmação/);
  edit(plans,'basico',{mercadopago_plan_id:'existing_plan_123'});
  await syncPlan(plans,'basico',options);assert.equal(plans.get('basico').sync_state,'synced');
});

test('concurrent sync/edits blocked; a definite rejected create can be retried',async t=>{
  const {plans,options}=fixture(t);const first=plans.start('basico');assert.throws(()=>plans.start('basico'),/já/);assert.throws(()=>edit(plans,'basico',{cycles:4}),/Aguarde/);plans.fail(first,false);
  await assert.rejects(syncPlan(plans,'basico',{env,fetcher:async()=>({ok:false,status:401})}),/Credencial/);
  assert.equal(plans.get('basico').sync_state,'error');await syncPlan(plans,'basico',options);
  assert.throws(()=>edit(plans,'intermediario',{mercadopago_plan_id:plans.get('basico').mercadopago_plan_id}),/outro plano/);
});

test('admin endpoints enforce session, OWNER/ADMIN, origin and payload; no secrets in response',async t=>{
  const {store,options}=fixture(t);
  await store.createOwner('owner@example.com','test-password-123');const owner=await store.authenticate('owner@example.com','test-password-123'),token=store.createSession(owner.id);
  function req(path,{method='GET',origin=env.ADMIN_SITE_ORIGIN,session=token,body}={}) {return new NextRequest(env.ADMIN_SITE_ORIGIN+'/api/admin/'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(session?{Cookie:cookieName(env)+'='+session}:{})},...(body?{body:JSON.stringify(body)}:{})});}
  const base='configuracoes/pagamentos',invoke=(path,opts={},customStore=store)=>handleAdminApi(req(path,opts),path.split('/'),{store:customStore,...options});
  assert.equal((await invoke(base,{session:null})).status,401);
  assert.equal((await invoke(base,{}, {...store,getSession:()=>({...owner,role:'VIEWER'})})).status,403);
  assert.equal((await invoke(base+'/basico',{method:'PATCH',origin:'https://evil.example',body:{}})).status,403);
  const response=await invoke(base);const result=await response.json();assert.equal(result.plans.length,3);assert(!JSON.stringify(result).includes(env.MERCADOPAGO_ACCESS_TOKEN));
  assert.equal((await invoke(base+'/basico/sync',{method:'POST',body:{}})).status,200);
  const p=store.repository.plans.get('basico');assert.equal((await invoke(base+'/basico',{method:'PATCH',body:{...p,monthly_price_cents:10900}})).status,200);
});
