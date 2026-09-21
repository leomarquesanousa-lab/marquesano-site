import { checkoutStore } from '../../../server/checkout.mjs';
import { cardCheckout, receiptCookie } from '../../../server/admin/card-checkout.mjs';
import { cookies } from 'next/headers';
import { isInputError } from '../../../server/admin/validation.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const json = (data, status = 200) => Response.json(data, {
  status, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }
});

export async function POST(request, { params }) {
  try {
    const { plan } = await params;
    const result = await cardCheckout(request, plan, (await checkoutStore()).repository);
    (await cookies()).set(receiptCookie, result.receipt, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/checkout', maxAge: 86400 });
    return json({ url: result.url });
  } catch (error) {
    return json({ error: isInputError(error) ? error.message : 'Plano temporariamente indisponível' }, isInputError(error) ? error.status : 503);
  }
}
