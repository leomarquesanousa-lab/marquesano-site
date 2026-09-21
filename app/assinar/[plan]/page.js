import { notFound, redirect } from 'next/navigation';
import { checkoutPlans } from '../../config/checkout-plans.mjs';

export default async function LegacySubscribePage({ params }) {
  const { plan } = await params;
  // This old route used stored catalog IDs, including professional for Business.
  const code = Object.keys(checkoutPlans).find(key => checkoutPlans[key].storedId === plan);
  if (!code) notFound();
  redirect(`/checkout/${code}`);
}
