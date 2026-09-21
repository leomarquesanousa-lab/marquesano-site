import 'server-only';
import { cache } from 'react';
import { initialPlans } from '../config/plans.mjs';
import { checkoutStore } from './checkout.mjs';

export const publicPlans = cache(async () => {
  let rows = initialPlans;
  if (process.env.DATABASE_URL) {
    try {rows = await (await checkoutStore()).repository.plans.list();}
    catch {rows = initialPlans.map((p) => ({ ...p, monthly_price_cents: null, active: false }));}
  }
  return rows.map(({ id, name, description, monthly_price_cents, cycles, active, revision, synced_revision, sync_state, mercadopago_plan_id }) => ({ id, name, description, monthly_price_cents, cycles, active, revision: revision || 0, available: Boolean(active && monthly_price_cents && mercadopago_plan_id && sync_state === 'synced' && synced_revision === revision && process.env.MERCADOPAGO_ACCESS_TOKEN) }));
});
