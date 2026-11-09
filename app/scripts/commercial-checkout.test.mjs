import test from 'node:test';
import assert from 'node:assert/strict';
import { commercialCheckoutAllowed } from '../config/commercial-checkout.mjs';
import { availableForCard, cardCheckout } from '../server/admin/card-checkout.mjs';
import { directCheckout } from '../server/admin/direct-checkout.mjs';
import { startCheckout } from '../server/admin/mercadopago.mjs';

const env = { MERCADOPAGO_SITE_ORIGIN: 'https://marquesano.com.br', MERCADOPAGO_PUBLIC_KEY: 'mock-public', MERCADOPAGO_ACCESS_TOKEN: 'mock-access' };
const plan = (id, price) => ({ id, monthly_price_cents: price, active: true, cycles: 12, revision: 1, synced_revision: 1, sync_state: 'synced', mercadopago_plan_id: 'mock-plan' });
const request = () => new Request('https://marquesano.com.br/api/checkout/professional', { method: 'POST', headers: { Origin: 'https://marquesano.com.br', 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: 1, payer_email: 'test@example.test', request_id: 'a'.repeat(64), terms: true }) });

test('only exact fixed commercial prices may initiate checkout', () => {
  for (const p of [plan('basico',9900),plan('intermediario',19900)]) { assert.equal(commercialCheckoutAllowed(p),true); assert.equal(availableForCard(p),true); }
  for (const p of [undefined,plan('basico',1),plan('intermediario',24900),plan('intermediario',null),plan('professional',34900),plan('unknown',9900)]) { assert.equal(commercialCheckoutAllowed(p),false); assert.equal(availableForCard(p),false); }
});

test('divergent prices and bespoke Business cannot reach provider or reserve a payment', async () => {
  for (const [code,p] of [['professional',plan('intermediario',24900)],['business',plan('professional',34900)]]) {
    const plans = { get: async () => p };
    const options = { env, fetcher: async () => { assert.fail('Provider must not be called'); } };
    assert.deepEqual(await directCheckout(new Request('https://marquesano.com.br/api/checkout/'+code,{method:'POST',headers:{Origin:'https://marquesano.com.br','Content-Type':'application/json'},body:JSON.stringify({revision:1})}), code, plans, options), {url:'/contato'});
    await assert.rejects(startCheckout(plans,p.id,1,options), e => e.status === 409);
    const repository = { plans, checkout: { get: async () => null, reserve: async () => assert.fail('No new attempt allowed') } };
    await assert.rejects(cardCheckout(request(),code,repository,options), e => e.status === 409);
  }
});

test('already authorized attempts remain recoverable after commercial prices change', async () => {
  const { attemptKey } = await import('../server/admin/card-checkout.mjs');
  const { createHash } = await import('node:crypto');
  const fingerprint = createHash('sha256').update(JSON.stringify(['professional','test@example.test',1])).digest('hex');
  const repository = { plans: {get:async()=>plan('intermediario',24900)},checkout:{get:async key=>{assert.equal(key,attemptKey('a'.repeat(64)));return {state:'authorized',fingerprint};}} };
  assert.equal((await cardCheckout(request(),'professional',repository,{env})).url,'/checkout/sucesso');
});
