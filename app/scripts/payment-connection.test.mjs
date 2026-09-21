import test from 'node:test';
import assert from 'node:assert/strict';
import { paymentConfiguration, testPaymentConnection } from '../server/admin/payment-connection.mjs';
import { paymentOperations } from '../server/admin/payment-api.mjs';

const env={ADMIN_SITE_ORIGIN:'https://marquesano.com.br',MERCADOPAGO_ACCESS_TOKEN:'private-token',MERCADOPAGO_PUBLIC_KEY:'private-key',MERCADOPAGO_WEBHOOK_SECRET:'private-secret'};
test('configuration exposes presence only and diagnoses invalid HTTPS origin',()=>{
  const config=paymentConfiguration(env);
  assert.equal(config.access_token,true);assert.equal(config.public_key,true);assert.equal(config.webhook_secret,true);
  assert.equal(config.webhook_url,'https://marquesano.com.br/api/mercadopago/webhook');
  assert.equal(config.configuration_error,null);
  assert.ok(!JSON.stringify(config).includes('private-'));
  assert.ok(paymentConfiguration({...env,ADMIN_SITE_ORIGIN:'http://localhost:3000'}).configuration_error);
});
test('real request contract uses bearer on official read-only subscription search',async()=>{
  const result=await testPaymentConnection({env,fetcher:async(url,options)=>{
    assert.equal(url,'https://api.mercadopago.com/preapproval_plan/search?limit=1');
    assert.equal(options.headers.Authorization,'Bearer private-token');
    assert.equal(options.cache,'no-store');assert.equal(options.redirect,'error');
    return {ok:true,json:async()=>({results:[]})};
  }});
  assert.equal(result.status,'connected');assert.equal(result.message,'Mercado Pago conectado com sucesso');
});
test('missing token, authentication, permission and communication failures are distinct and sanitized',async()=>{
  assert.equal((await testPaymentConnection({env:{},fetcher:()=>assert.fail('unexpected fetch')})).status,'unconfigured');
  for(const [status,text] of [[401,'inválido'],[403,'permissão'],[429,'Limite'],[500,'comunicação']]){
    const result=await testPaymentConnection({env,fetcher:async()=>({ok:false,status})});
    assert.equal(result.status,'error');assert.ok(result.message.includes(text));
  }
  for(const fetcher of [async()=>{throw Error('private-token');},async()=>({ok:true,json:async()=>({})})]){
    const result=await testPaymentConnection({env,fetcher});assert.equal(result.status,'error');assert.ok(!result.message.includes('private-token'));
  }
});
test('connection endpoint remains OWNER/ADMIN only',async()=>{
  const request=new Request('https://marquesano.com.br/api/admin/configuracoes/pagamentos/test-connection',{method:'POST'});
  for(const role of ['VIEWER','SALES','MARKETING'])await assert.rejects(paymentOperations(request,['test-connection'],{role},{},{env}),e=>e.status===403);
  for(const role of ['OWNER','ADMIN'])assert.equal((await paymentOperations(request,['test-connection'],{role},{},{env,fetcher:async()=>({ok:true,json:async()=>({results:[]})})})).connection.status,'connected');
});
