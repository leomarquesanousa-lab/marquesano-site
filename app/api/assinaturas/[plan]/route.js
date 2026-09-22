import { checkoutPlans } from '../../../config/checkout-plans.mjs';

// Compatibility for old site tabs: always continue at the single local checkout.
import { validPaymentOrigin } from '../../../server/admin/payment-origin.mjs';
export async function POST(request, { params }) {
  const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };
  if (!validPaymentOrigin(request, process.env)) return Response.json({ error: 'Origem inválida.' }, { status: 403, headers });
  const { plan } = await params;
  const code = Object.keys(checkoutPlans).find(key => checkoutPlans[key].storedId === plan);
  return code ? Response.json({ url: `/checkout/${code}` }, { headers }) : Response.json({ error: 'Plano não encontrado.' }, { status: 404, headers });
}
