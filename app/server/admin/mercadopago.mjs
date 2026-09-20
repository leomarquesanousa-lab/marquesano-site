import { InputError } from './validation.mjs';

function credentials(env) {
  if (!env.MERCADOPAGO_ACCESS_TOKEN?.trim()) throw new InputError('Configure MERCADOPAGO_ACCESS_TOKEN no servidor.',503);
  let origin;
  try { origin=new URL(env.ADMIN_SITE_ORIGIN); } catch { throw new InputError('Configure ADMIN_SITE_ORIGIN no servidor.',503); }
  if (origin.protocol!=='https:'||origin.origin!==env.ADMIN_SITE_ORIGIN) throw new InputError('Mercado Pago requer ADMIN_SITE_ORIGIN com HTTPS.',503);
  return {token:env.MERCADOPAGO_ACCESS_TOKEN,origin:origin.origin};
}

export async function mpRequest(path,{env=process.env,fetcher=fetch,method='GET',body}={}) {
  const {token}=credentials(env);
  let response;
  try {
    response=await fetcher('https://api.mercadopago.com'+path,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000),cache:'no-store',redirect:'error'});
  } catch { throw new InputError('Mercado Pago não respondeu. Verifique o resultado antes de repetir a criação.',502); }
  if (!response.ok) {
    const error=new InputError(response.status===401||response.status===403?'Credencial do Mercado Pago inválida ou sem permissão.':response.status===404?'Plano não encontrado no Mercado Pago.':'Mercado Pago não confirmou a operação. Confira os dados do plano.',502);
    error.definiteRejection=response.status>=400&&response.status<500;
    throw error;
  }
  try { return await response.json(); } catch { throw new InputError('Resposta inválida do Mercado Pago.',502); }
}

export function checkoutUrl(remote) {
  let url;
  try {url=new URL(remote.init_point);} catch {throw new InputError('Checkout do plano indisponível.',503);}
  if (url.protocol!=='https:'||url.hostname!=='www.mercadopago.com.br'||url.port||url.username||url.password||url.pathname!=='/subscriptions/checkout'||url.searchParams.get('preapproval_plan_id')!==remote.id) throw new InputError('Checkout do plano inválido.',503);
  return url.href;
}

export function checkRemote(plan,remote) {
  const recurring=remote.auto_recurring;
  if (remote.id!==plan.mercadopago_plan_id||remote.status!==(plan.active?'active':'inactive')||!recurring||recurring.frequency!==1||recurring.frequency_type!=='months'||recurring.currency_id!=='BRL'||Math.round(Number(recurring.transaction_amount)*100)!==plan.monthly_price_cents||recurring.repetitions!==plan.cycles||recurring.free_trial?.frequency>0||recurring.billing_day_proportional===true) throw new InputError('O plano no Mercado Pago difere da configuração salva. Sincronize antes de contratar.',409);
}

export async function syncPlan(plans,id,options={}) {
  const {env=process.env}=options;
  const {origin}=credentials(env);
  const p=plans.start(id);
  try {
    const body={reason:`Marquesano — ${p.name}`,auto_recurring:{frequency:1,frequency_type:'months',repetitions:p.cycles,transaction_amount:p.monthly_price_cents/100,currency_id:'BRL'},back_url:origin+'/assinatura/retorno'};
    if(p.mercadopago_plan_id)body.status=p.active?'active':'inactive';
    const remote=await mpRequest('/preapproval_plan'+(p.mercadopago_plan_id?'/'+encodeURIComponent(p.mercadopago_plan_id):''),{...options,method:p.mercadopago_plan_id?'PUT':'POST',body});
    if(typeof remote.id!=='string'||!/^[a-zA-Z0-9_-]{8,100}$/.test(remote.id)||(p.mercadopago_plan_id&&remote.id!==p.mercadopago_plan_id))throw new InputError('Mercado Pago retornou um ID inválido.',502);
    // Save the provider ID even if subsequent verification fails, avoiding a duplicate POST.
    plans.finish(p,remote.id);
    const verified=await mpRequest('/preapproval_plan/'+encodeURIComponent(remote.id),options);
    checkRemote({...p,mercadopago_plan_id:remote.id},verified);
    if(p.active)checkoutUrl(verified);
    return plans.get(id);
  } catch(error) {plans.fail(p,!error.definiteRejection);throw error;}
}

export async function startCheckout(plans,id,revision,options={}) {
  const p=plans.get(id);
  if (!p.active||!p.monthly_price_cents||!p.mercadopago_plan_id||p.sync_state!=='synced'||p.synced_revision!==p.revision) throw new InputError('Este plano ainda não está disponível para contratação.',409);
  if (revision!==p.revision) throw new InputError('As condições do plano mudaram. Recarregue a página e confira os valores.',409);
  const remote=await mpRequest('/preapproval_plan/'+encodeURIComponent(p.mercadopago_plan_id),options);
  checkRemote(p,remote);
  const current=plans.get(id);
  if(current.revision!==p.revision||current.sync_state!=='synced')throw new InputError('O plano está sendo atualizado. Tente novamente.',409);
  return checkoutUrl(remote);
}
