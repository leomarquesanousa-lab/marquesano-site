import { adminStore, configured } from '../../../server/admin/core.mjs';
import { directCheckout } from '../../../server/admin/direct-checkout.mjs';
import { InputError, isInputError } from '../../../server/admin/validation.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const json = (data, status = 200) => Response.json(data, {
  status, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
});

export async function POST(request, { params }) {
  try {
    if (!configured()) throw new InputError('Plano temporariamente indisponível', 503);
    const { plan } = await params;
    return json(await directCheckout(request, plan, adminStore().repository.plans));
  } catch (error) {
    return json({ error: isInputError(error) ? error.message : 'Plano temporariamente indisponível' }, isInputError(error) ? error.status : 503);
  }
}
