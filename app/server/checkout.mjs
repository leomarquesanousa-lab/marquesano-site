import { createAdminStore } from './admin/core.mjs';

// Public payment/catalog access uses the same schema and DATABASE_URL, without
// invoking the unrelated administrative OWNER provisioning or login flow.
const key = Symbol.for('marquesano.public.checkout.store');
export async function checkoutStore() {
  if (!process.env.DATABASE_URL) throw Error('Checkout database configuration missing.');
  if (!globalThis[key]) globalThis[key] = createAdminStore(process.env.DATABASE_URL);
  try { return await globalThis[key]; }
  catch (error) { delete globalThis[key]; throw error; }
}
