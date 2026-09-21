import { checkoutPlans } from '../../config/checkout-plans.mjs';
import { startCheckout } from './mercadopago.mjs';
import { InputError, isInputError, readJson } from './validation.mjs';

export async function directCheckout(request, code, plans, options = {}) {
  const env = options.env || process.env;
  if (request.headers.get('origin') !== env.ADMIN_SITE_ORIGIN) throw new InputError('Origem inválida.', 403);
  if (!Object.hasOwn(checkoutPlans, code)) throw new InputError('Plano não encontrado.', 404);
  const data = await readJson(request, 512);
  if (Object.keys(data).some((key) => key !== 'revision') || !Number.isSafeInteger(data.revision)) {
    throw new InputError('Dados de contratação inválidos.');
  }
  const id = checkoutPlans[code].storedId;
  const plan = await plans.get(id);
  if (!plan.active || !Number.isSafeInteger(plan.monthly_price_cents) || plan.monthly_price_cents <= 0 ||
  !Number.isInteger(plan.cycles) || plan.cycles < 1 || plan.cycles > 1200 ||
  !plan.mercadopago_plan_id || plan.sync_state !== 'synced' || plan.synced_revision !== plan.revision) {
    throw new InputError('Plano temporariamente indisponível', 409);
  }
  try {
    return { url: await startCheckout(plans, id, data.revision, options) };
  } catch (error) {
    if (isInputError(error) && error.status === 409) throw error;
    throw new InputError('Não foi possível iniciar a assinatura no Mercado Pago. Tente novamente em instantes.', 503);
  }
}
