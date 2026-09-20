import { createHmac, timingSafeEqual, createHash } from 'node:crypto';
import { adminStore, configured } from './core.mjs';
import { InputError, isInputError, readJson } from './validation.mjs';

const topics=['subscription_preapproval','subscription_authorized_payment','payment'];
const idOf=value=>{
  if(typeof value==='number'&&!Number.isSafeInteger(value))throw new InputError('Recurso inválido.',400);
  if(!['number','string'].includes(typeof value)||!/^[a-zA-Z0-9_-]{1,100}$/.test(String(value)))throw new InputError('Recurso inválido.',400);
  return String(value).toLowerCase();
};
const date=value=>{
  if(value==null)return null;
  if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))throw new InputError('Data do recurso inválida.',502);
  return new Date(value).toISOString();
};
const version=value=>{const v=date(value);if(!v)throw new InputError('Versão do recurso indisponível.',502);return Date.parse(v);};
const status=value=>{if(typeof value!=='string'||!/^[a-z_]{1,60}$/.test(value))throw new InputError('Status do recurso inválido.',502);return value;};

export function webhookConfiguration(env=process.env) {
  let url=null;
  try {const origin=new URL(env.ADMIN_SITE_ORIGIN);if(origin.protocol==='https:'&&origin.origin===env.ADMIN_SITE_ORIGIN)url=origin.origin+'/api/mercadopago/webhook';}catch{}
  return {configured:Boolean(url&&env.MERCADOPAGO_ACCESS_TOKEN?.trim()&&env.MERCADOPAGO_WEBHOOK_SECRET?.trim()),secret_configured:Boolean(env.MERCADOPAGO_WEBHOOK_SECRET?.trim()),url};
}

export function verifyWebhook(request,secret) {
  if(!secret?.trim())throw new InputError('Webhook indisponível.',503);
  const params=new URL(request.url).searchParams;
  if(params.getAll('data.id').length!==1)throw new InputError('Assinatura inválida.',401);
  const id=idOf(params.get('data.id')),requestId=request.headers.get('x-request-id'),signature=request.headers.get('x-signature')||'';
  if(!requestId||!/^[a-zA-Z0-9_-]{1,200}$/.test(requestId))throw new InputError('Assinatura inválida.',401);
  const parts=signature.split(',').map(p=>p.trim().split('='));
  const timestamps=parts.filter(([key])=>key==='ts'),hashes=parts.filter(([key])=>key==='v1');
  if(timestamps.length!==1||hashes.length!==1||!/^\d{1,16}$/.test(timestamps[0][1]||'')||!/^[a-fA-F0-9]{64}$/.test(hashes[0][1]||''))throw new InputError('Assinatura inválida.',401);
  // Official manifest: data.id from the URL (lowercase), request ID and the original timestamp.
  const manifest=`id:${id};request-id:${requestId};ts:${timestamps[0][1]};`;
  const expected=createHmac('sha256',secret).update(manifest).digest();
  if(!timingSafeEqual(expected,Buffer.from(hashes[0][1],'hex')))throw new InputError('Assinatura inválida.',401);
  // No short freshness window: official retries may be delayed. Replays re-read the provider
  // and upsert the same resource/version, never triggering a charge or duplicate payment.
  return id;
}

async function confirmedResources(topic,id,billing,{env,fetcher,signal}) {
  async function get(path) {
    let response;
    try {response=await fetcher('https://api.mercadopago.com'+path,{headers:{Authorization:`Bearer ${env.MERCADOPAGO_ACCESS_TOKEN}`},signal,cache:'no-store',redirect:'error'});}catch{throw new InputError('Confirmação temporariamente indisponível.',503);}
    if(!response.ok)throw new InputError('Confirmação temporariamente indisponível.',503);
    try {return await response.json();}catch{throw new InputError('Resposta do provedor inválida.',502);}
  }
  const path=topic==='payment'?'/v1/payments/':topic==='subscription_preapproval'?'/preapproval/':'/authorized_payments/';
  const [primary,owner]=await Promise.all([get(path+encodeURIComponent(id)),get('/users/me')]);
  if(idOf(primary.id)!==id)throw new InputError('Recurso divergente.',502);
  const ownerId=idOf(owner.id);
  const owned=resource=>{if(idOf(resource.collector_id)!==ownerId)throw new InputError('Recurso de outra conta.',403);};
  let subscription=topic==='subscription_preapproval'?primary:null,invoice=topic==='subscription_authorized_payment'?primary:null,payment=topic==='payment'?primary:null;
  if(payment) {
    owned(payment);
    // Resolve via the official invoice search; never infer a subscription from payer email
    // or an untrusted external_reference/notification payload.
    const found=await get('/authorized_payments/search?payment_id='+encodeURIComponent(id));
    if(!Array.isArray(found.results))throw new InputError('Consulta de fatura inválida.',502);
    const matches=found.results.filter(row=>row.payment?.id!=null&&String(row.payment.id)===id);
    if(matches.length>1)throw new InputError('Vínculo de pagamento ambíguo.',502);
    if(matches.length) {
      invoice=await get('/authorized_payments/'+encodeURIComponent(idOf(matches[0].id)));
      if(idOf(invoice.id)!==idOf(matches[0].id)||idOf(invoice.payment?.id)!==id)throw new InputError('Fatura divergente.',502);
    }
    // A payment may arrive before its invoice is indexed. Keep it unlinked until the invoice
    // notification/retry confirms the relationship; its external payment ID remains unique.
  }
  if(invoice) {
    const subscriptionId=idOf(invoice.preapproval_id);
    subscription=await get('/preapproval/'+encodeURIComponent(subscriptionId));
    if(idOf(subscription.id)!==subscriptionId)throw new InputError('Assinatura divergente.',502);
    if(!payment&&invoice.payment?.id!=null) {
      payment=await get('/v1/payments/'+encodeURIComponent(idOf(invoice.payment.id)));
      if(idOf(payment.id)!==idOf(invoice.payment.id))throw new InputError('Pagamento divergente.',502);
    }
  }
  if(payment)owned(payment);
  let normalizedSubscription=null,normalizedInvoice=null,normalizedPayment=null;
  if(subscription) {
    owned(subscription);
    if(subscription.preapproval_plan_id==null)return {ignored:true};
    const plan=billing.plan(idOf(subscription.preapproval_plan_id));
    if(!plan)return {ignored:true};
    normalizedSubscription={id:idOf(subscription.id),plan_id:plan,status:status(subscription.status),next_payment_date:date(subscription.next_payment_date),payer_email:typeof subscription.payer_email==='string'?subscription.payer_email.slice(0,254):null,updated_at:version(subscription.last_modified)};
  }
  if(invoice)normalizedInvoice={id:idOf(invoice.id),subscription_id:normalizedSubscription.id,status:status(invoice.status),debit_date:date(invoice.debit_date),updated_at:version(invoice.last_modified)};
  if(payment) {
    const amount=Math.round(Number(payment.transaction_amount)*100);
    if(payment.transaction_amount==null||!Number.isSafeInteger(amount)||amount<0||! /^[A-Z]{3}$/.test(payment.currency_id||''))throw new InputError('Valor do pagamento inválido.',502);
    normalizedPayment={id:idOf(payment.id),subscription_id:normalizedSubscription?.id||null,invoice_id:normalizedInvoice?.id||null,status:status(payment.status),status_detail:typeof payment.status_detail==='string'?payment.status_detail.slice(0,200):null,amount_cents:amount,currency:payment.currency_id,paid_at:date(payment.date_approved),updated_at:version(payment.date_last_updated)};
  }
  // Hash only confirmed financial resource fields, not the unsigned notification event ID.
  const resource=topic==='payment'?normalizedPayment:topic==='subscription_preapproval'?normalizedSubscription:normalizedInvoice;
  const identity={...resource};delete identity.subscription_id;delete identity.invoice_id;
  const key=createHash('sha256').update(JSON.stringify([topic,id,identity])).digest('hex');
  return {event:{key,topic,id},subscription:normalizedSubscription,invoice:normalizedInvoice,payment:normalizedPayment};
}

export async function handleMercadoPagoWebhook(request,dependencies={}) {
  const env=dependencies.env||process.env;
  const json=(body,statusCode=200)=>Response.json(body,{status:statusCode,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
  try {
    if(request.method!=='POST')return json({error:'Método não permitido.'},405);
    const id=verifyWebhook(request,env.MERCADOPAGO_WEBHOOK_SECRET);
    if(!configured(env)||!env.MERCADOPAGO_ACCESS_TOKEN?.trim())throw new InputError('Webhook indisponível.',503);
    const body=await readJson(request,16384);
    if(idOf(body.data?.id)!==id)throw new InputError('Recurso divergente.',400);
    const params=new URL(request.url).searchParams;
    if(params.has('type')&&(params.getAll('type').length!==1||params.get('type')!==body.type))throw new InputError('Tipo divergente.',400);
    if(!topics.includes(body.type))return json({ok:true,ignored:true});
    const billing=(dependencies.store||adminStore()).repository.billing;
    const resources=await confirmedResources(body.type,id,billing,{env,fetcher:dependencies.fetcher||fetch,signal:AbortSignal.timeout(18000)});
    if(resources.ignored)return json({ok:true,ignored:true});
    return json({ok:true,...billing.apply(resources)});
  }catch(error){return json({error:isInputError(error)?error.message:'Não foi possível processar a notificação.'},isInputError(error)?error.status:503);}
}
