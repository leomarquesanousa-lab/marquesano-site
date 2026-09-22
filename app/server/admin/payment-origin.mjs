import { InputError } from './validation.mjs';
import { validAdminRequestOrigin } from './origin.mjs';

export function paymentSiteOrigin(env = process.env) {
  try {
    const url = new URL(env.MERCADOPAGO_SITE_ORIGIN);
    if (url.protocol !== 'https:' || url.username || url.password || !['https://marquesano.com.br', 'https://www.marquesano.com.br'].includes(url.origin)) throw Error();
    return url.origin;
  } catch { throw new InputError('Configure MERCADOPAGO_SITE_ORIGIN com a origem HTTPS pública da Marquesano.', 503); }
}

export function validPaymentOrigin(request, env = process.env) {
  try {
    const origin = env.NODE_ENV === 'development' ? 'http://localhost:3000' : paymentSiteOrigin(env);
    // Reuse the exact CSRF policy; never derive a trusted origin from request headers.
    return validAdminRequestOrigin(request, { ...env, ADMIN_SITE_ORIGIN: origin });
  } catch { return false; }
}
