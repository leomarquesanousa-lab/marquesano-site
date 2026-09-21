import { webhookConfiguration } from './mercadopago-webhook.mjs';

export function paymentConfiguration(env = process.env) {
  const webhook = webhookConfiguration(env);
  return {
    access_token: Boolean(env.MERCADOPAGO_ACCESS_TOKEN?.trim()),
    public_key: Boolean(env.MERCADOPAGO_PUBLIC_KEY?.trim()),
    webhook_secret: webhook.secret_configured,
    webhook_url: webhook.url,
    configuration_error: webhook.url ? null : 'Configuração incompleta: defina ADMIN_SITE_ORIGIN como a origem HTTPS pública, sem barra final.',
  };
}

export async function testPaymentConnection({ env = process.env, fetcher = fetch } = {}) {
  if (!env.MERCADOPAGO_ACCESS_TOKEN?.trim()) return { status: 'unconfigured', message: 'Access Token ausente. Configure MERCADOPAGO_ACCESS_TOKEN no servidor.' };
  try {
    const response = await fetcher('https://api.mercadopago.com/preapproval_plan/search?limit=1', {
      headers: { Authorization: `Bearer ${env.MERCADOPAGO_ACCESS_TOKEN.trim()}` },
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return { status: 'error', message: response.status === 401
      ? 'Access Token inválido ou expirado.' : response.status === 403
        ? 'Erro de autenticação: Access Token sem permissão para acessar planos de assinatura.'
        : response.status === 429 ? 'Limite de consultas do Mercado Pago atingido. Tente novamente em instantes.'
          : 'Erro de comunicação com a API do Mercado Pago. Tente novamente em instantes.' };
    const data = await response.json();
    if (!Array.isArray(data.results)) throw Error('Invalid response');
    return { status: 'connected', message: 'Mercado Pago conectado com sucesso' };
  } catch {
    return { status: 'error', message: 'Erro de comunicação com a API do Mercado Pago. Tente novamente em instantes.' };
  }
}
