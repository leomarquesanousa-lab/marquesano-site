import { createHash } from 'node:crypto';
import { checkoutPlans } from '../../config/checkout-plans.mjs';
import { checkRemote, mpRequest } from './mercadopago.mjs';
import { InputError, email, readJson } from './validation.mjs';
import { validPaymentOrigin, paymentSiteOrigin } from './payment-origin.mjs';

export const receiptCookie = 'marquesano_checkout_receipt';
export const attemptKey = value => createHash('sha256').update(value).digest('hex');
const uncertain = () => new InputError('A assinatura ainda não foi confirmada. Use Verificar assinatura antes de tentar uma nova contratação.', 202);
export function availableForCard(plan) {
  return Boolean(plan?.active && Number.isSafeInteger(plan.monthly_price_cents) && plan.monthly_price_cents > 0 &&
    plan.cycles === 12 && plan.mercadopago_plan_id && plan.sync_state === 'synced' && plan.synced_revision === plan.revision);
}

export async function cardCheckout(request, code, repository, options = {}) {
  const env = options.env || process.env;
  if (!validPaymentOrigin(request, env)) throw new InputError('Origem inválida.', 403);
  if (!Object.hasOwn(checkoutPlans, code)) throw new InputError('Plano não encontrado.', 404);
  const data = await readJson(request, 2048);
  const allowed = ['payer_email', 'card_token_id', 'revision', 'request_id', 'terms'];
  if (Object.keys(data).some(key => !allowed.includes(key)) || !Number.isSafeInteger(data.revision) ||
    !/^[a-f0-9]{64}$/.test(data.request_id || '') || data.terms !== true) throw new InputError('Confira os dados e aceite os Termos de Serviço.');
  const payer = email(data.payer_email);
  const key = attemptKey(data.request_id);
  const fingerprint = attemptKey(JSON.stringify([code, payer, data.revision]));
  const { plans, checkout, billing } = repository;
  const plan = await plans.get(checkoutPlans[code].storedId);
  const previous = await checkout.get(key);
  if (previous && previous.fingerprint !== fingerprint) throw new InputError('Esta tentativa pertence a outra contratação.', 409);
  if (previous?.state === 'authorized') return { receipt: data.request_id, url: '/checkout/sucesso' };
  if (previous?.state === 'rejected') throw new InputError('Pagamento não autorizado. Confira os dados ou use outro cartão.', 422);

  async function confirm(remote) {
    if (typeof remote.id !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(remote.id) || remote.preapproval_plan_id !== plan.mercadopago_plan_id ||
      remote.external_reference !== key || remote.status !== 'authorized') throw uncertain();
    await checkout.complete(key, remote.id, () => billing.apply({
      event: { key: 'checkout:' + key, topic: 'subscription_preapproval', id: remote.id },
      subscription: { id: remote.id, plan_id: plan.id, status: remote.status,
        next_payment_date: remote.next_payment_date ? new Date(remote.next_payment_date).toISOString() : null, payer_email: payer,
        created_at:remote.date_created ? new Date(remote.date_created).toISOString() : previous?.created_at ? new Date(previous.created_at).toISOString() : null, external_reference:key,
        amount_cents:previous?.amount_cents ?? plan.monthly_price_cents,currency:'BRL',
        cycles:previous ? (previous.terms_version==='2026-09-checkout-12-months'?12:null) : plan.cycles,
        end_date:remote.auto_recurring?.end_date ? new Date(remote.auto_recurring.end_date).toISOString() : null,
        updated_at: Date.parse(remote.last_modified || remote.date_created) || Date.now() },
    }));
    await billing.notifications?.dispatch({env,fetcher:options.fetcher||fetch,limit:1,subscriptionId:remote.id}).catch(()=>console.error('SALES_EMAIL_DISPATCH_FAILED'));
    return { receipt: data.request_id, url: '/checkout/sucesso' };
  }

  if (previous) {
    // Never repeat a possibly accepted POST, including after a process restart.
    try {
      // Use documented search filters, then match our opaque reference exactly.
      const matches = [];
      let complete = false;
      for (let offset = 0; offset < 300; offset += 100) {
        const query = new URLSearchParams({ payer_email: payer, preapproval_plan_id: plan.mercadopago_plan_id, limit: '100', offset: String(offset) });
        const result = await mpRequest('/preapproval/search?' + query, options);
        if (!Array.isArray(result.results)) throw uncertain();
        matches.push(...result.results.filter(item => item.external_reference === key));
        if (result.results.length < 100 || offset + result.results.length >= Number(result.paging?.total)) { complete = true; break; }
      }
      if (complete && matches.length === 1) return await confirm(await mpRequest('/preapproval/' + encodeURIComponent(matches[0].id), options));
    } catch { /* A failed lookup is not evidence that creation failed. */ }
    throw uncertain();
  }
  if (!availableForCard(plan) || !env.MERCADOPAGO_PUBLIC_KEY?.trim() || !env.MERCADOPAGO_ACCESS_TOKEN?.trim()) throw new InputError('Plano temporariamente indisponível', 409);
  if (data.revision !== plan.revision) throw new InputError('As condições do plano mudaram. Recarregue a página e confira os valores.', 409);
  if (typeof data.card_token_id !== 'string' || !/^[a-zA-Z0-9_-]{16,256}$/.test(data.card_token_id)) throw new InputError('Informe um cartão válido para continuar.');
  try { checkRemote(plan, await mpRequest('/preapproval_plan/' + encodeURIComponent(plan.mercadopago_plan_id), options)); }
  catch { throw new InputError('Plano temporariamente indisponível', 503); }
  const current = await plans.get(plan.id);
  if (!availableForCard(current) || current.revision !== plan.revision) throw new InputError('As condições do plano mudaram. Recarregue a página.', 409);
  if (!await checkout.reserve({ id: key, fingerprint, code, amount: plan.monthly_price_cents })) {
    throw new InputError('Já existe uma contratação em andamento ou autorizada para este plano e e-mail. Verifique a tentativa anterior ou fale com o suporte.', 409);
  }
  let remote;
  try {
    remote = await mpRequest('/preapproval', { ...options, method: 'POST', body: {
      preapproval_plan_id: plan.mercadopago_plan_id, payer_email: payer, card_token_id: data.card_token_id,
      external_reference: key, status: 'authorized', reason: 'Marquesano — ' + checkoutPlans[code].name,
      back_url: paymentSiteOrigin(env) + '/checkout/sucesso',
    } });
  } catch (error) {
    // Only explicit provider rejection permits a new creation attempt.
    await checkout.state(key, error.definiteRejection ? 'rejected' : 'unknown');
    if (error.definiteRejection && error.cardValidationFailed) throw new InputError('O Mercado Pago não conseguiu validar este cartão. Confira os dados informados ou tente outro cartão.', 422);
    if (error.definiteRejection) throw new InputError('Mercado Pago não autorizou a assinatura. Confira os dados do cartão ou use outro cartão. Se persistir, fale com o suporte.', 422);
    throw uncertain();
  }
  try { return await confirm(remote); }
  catch { await checkout.state(key, 'unknown'); throw uncertain(); }
}
