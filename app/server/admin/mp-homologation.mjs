import { randomUUID } from 'node:crypto';
import { InputError, readJson } from './validation.mjs';

export function localOnly(host, env = process.env) {
  if (env.NODE_ENV !== 'development' || !/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host || '')) throw new InputError('Não encontrado.', 404);
}
function config(env) {
  const keys = ['PUBLIC_KEY','ACCESS_TOKEN','BUYER_EMAIL','PLAN_ID'];
  const result = Object.fromEntries(keys.map(k => [k, env['MERCADOPAGO_TEST_' + k]?.trim()]));
  if (keys.some(k => !result[k])) throw new InputError('Configure as quatro variáveis MERCADOPAGO_TEST no ambiente local.', 503);
  return result;
}
export async function testCatalog(env = process.env, fetcher = fetch) {
  localOnly('localhost', env);
  const c = config(env);
  const get = async path => {
    const r = await fetcher('https://api.mercadopago.com' + path, { headers: { Authorization: 'Bearer ' + c.ACCESS_TOKEN }, cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new InputError('Não foi possível validar vendedor/plano de teste. HTTP ' + r.status, 503);
    return r.json();
  };
  const seller = await get('/users/me');
  if (String(seller.id) !== '3631388128' || !seller.tags?.includes('test_user')) throw new InputError('Credencial não pertence ao vendedor de teste autorizado.', 403);
  const plan = await get('/preapproval_plan/' + encodeURIComponent(c.PLAN_ID));
  const a = plan.auto_recurring;
  if (String(plan.collector_id) !== '3631388128' || plan.status !== 'active' || a?.currency_id !== 'BRL' || a.frequency !== 1 || a.frequency_type !== 'months' || a.repetitions !== 12 || a.transaction_amount !== 5) throw new InputError('Plano não corresponde à homologação de R$ 5 por 12 meses.', 403);
  return { publicKey: c.PUBLIC_KEY, buyerEmail: c.BUYER_EMAIL, amount: 500 };
}

const key = Symbol.for('marquesano.mp.manual-test.attempts');
function sanitized(data, response, env, token) {
  const secrets = [...Object.values(env).filter(v => typeof v === 'string' && v.length > 5), token];
  const clean = value => {
    if (typeof value !== 'string' && typeof value !== 'number') return null;
    let s = String(value);
    for (const secret of secrets) if (secret) s = s.split(secret).join('[redacted]');
    return s.replace(/(?:APP_USR-|TEST-)[\w-]+/g, '[credential]').replace(/\b[a-f\d]{24,}\b/gi,'[token]').replace(/(?:https?|postgres(?:ql)?):\/\/\S+/g,'[url]').replace(/[\w.+-]+@[\w.-]+/g,'[email]').replace(/(?:\d[ -]?){12,19}/g,'[card]').replace(/\b\d{3,4}\b/g,'[number]').replace(/[\x00-\x1f]/g,' ').slice(0,1000);
  };
  const cause = Array.isArray(data.cause) ? data.cause.slice(0,10).map(c => ({ code: clean(c.code), description: clean(c.description), message: clean(c.message) })) : clean(data.cause);
  const id = response.headers.get('x-request-id');
  return { http_status: response.status, status: clean(data.status), code: clean(data.code || data.error), message: clean(data.message), cause, status_detail: clean(data.status_detail), request_id: /^[a-zA-Z0-9-]{1,100}$/.test(id || '') ? id : null, subscription_created: response.ok && typeof data.id === 'string', authorized: response.ok && data.status === 'authorized' };
}
export async function homologation(request, env = process.env, fetcher = fetch) {
  localOnly(request.headers.get('host'), env);
  const origin = request.headers.get('origin');
  if (!origin || new URL(origin).origin !== new URL(request.url).origin || !['same-origin', null].includes(request.headers.get('sec-fetch-site'))) throw new InputError('Origem inválida.', 403);
  const d = await readJson(request, 2048);
  if (d.terms !== true || !/^[a-f0-9]{64}$/.test(d.request_id || '') || !/^[a-zA-Z0-9_-]{16,256}$/.test(d.card_token_id || '')) {
    console.info('TEST_CARD_TOKEN_CREATED=false');
    throw new InputError('Token novo e aceite dos termos são obrigatórios.');
  }
  const attempts = globalThis[key] ||= new Map();
  if (attempts.has(d.request_id)) return attempts.get(d.request_id);
  if (attempts.size >= 100) throw new InputError('Limite de tentativas de homologação atingido.', 429);
  const pending = (async () => {
    await testCatalog(env, fetcher);
    const c = config(env);
    console.info('TEST_CARD_TOKEN_CREATED=true');
    const r = await fetcher('https://api.mercadopago.com/preapproval', { method: 'POST', headers: { Authorization: 'Bearer ' + c.ACCESS_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify({ payer_email: c.BUYER_EMAIL, card_token_id: d.card_token_id, preapproval_plan_id: c.PLAN_ID, status: 'authorized', external_reference: 'homologacao-' + randomUUID(), reason: 'Marquesano Homologação', back_url: 'https://marquesano.com.br/checkout/sucesso' }), signal: AbortSignal.timeout(30000), redirect: 'error' });
    const result = sanitized(await r.json().catch(() => ({})), r, env, d.card_token_id);
    for (const field of ['http_status','status','code','message','cause','status_detail','request_id']) console.info('MERCADOPAGO_TEST_PREAPPROVAL_' + field.toUpperCase() + '=' + JSON.stringify(result[field]));
    return result;
  })();
  attempts.set(d.request_id, pending); // Never replay an uncertain POST in this process.
  return pending;
}
