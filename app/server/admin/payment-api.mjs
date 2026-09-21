import { InputError, readJson } from './validation.mjs';
import { syncPlan } from './mercadopago.mjs';
import { webhookConfiguration } from './mercadopago-webhook.mjs';
import { paymentConfiguration, testPaymentConnection } from './payment-connection.mjs';

export async function paymentOperations(request, path, user, repository, options = {}) {
  if (!['OWNER', 'ADMIN'].includes(user.role)) throw new InputError('Acesso não permitido.', 403);
  const [id, action] = path;
  if (!id && request.method === 'GET') return { plans: await repository.plans.list(), configured: Boolean((options.env || process.env).MERCADOPAGO_ACCESS_TOKEN?.trim()), configuration: paymentConfiguration(options.env || process.env), webhook: webhookConfiguration(options.env || process.env) };
  if (id === 'test-connection' && !action && path.length === 1 && request.method === 'POST') return { connection: await testPaymentConnection(options), configuration: paymentConfiguration(options.env || process.env) };
  if (id === 'historico' && !action && request.method === 'GET') {
    const page = Number(new URL(request.url).searchParams.get('page') || 1);
    if (!Number.isInteger(page) || page < 1 || page > 100000) throw new InputError('Página inválida.');
    return { ...(await repository.billing.report(page)), webhook: webhookConfiguration(options.env || process.env) };
  }
  if (path.length > 2) throw new InputError('Rota inválida.', 404);
  if (id && !action && request.method === 'PATCH') {
    const plan = await repository.plans.save(id, await readJson(request, 4000));
    await repository.audit(user, 'update', 'subscription_plans', id);
    return { plan };
  }
  if (id && action === 'sync' && request.method === 'POST') {
    const existing = await repository.plans.get(id);
    if (!existing.mercadopago_plan_id && ['unknown', 'syncing'].includes(existing.sync_state)) throw new InputError('A criação anterior ainda não foi confirmada. A sincronização foi bloqueada para evitar duplicidade. Aguarde a confirmação ou solicite a reconciliação da operação; não crie outro plano.', 409);
    const plan = await syncPlan(repository.plans, id, options);
    await repository.audit(user, 'sync', 'subscription_plans', id);
    return { plan };
  }
  throw new InputError('Rota ou método inválido.', 405);
}
