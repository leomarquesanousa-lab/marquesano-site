import { commercialPlans } from './commercial-plans.mjs';

// Read-only gate for new checkouts; never changes provider prices or existing subscriptions.
export function commercialCheckoutAllowed(plan, storedId = plan?.id) {
  const advertised = commercialPlans.find(item => item.id === storedId);
  return Boolean(advertised && !advertised.startingAt &&
    Number.isSafeInteger(plan?.monthly_price_cents) && plan.monthly_price_cents === advertised.price * 100);
}
