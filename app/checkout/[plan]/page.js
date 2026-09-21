import { notFound } from 'next/navigation';
import { checkoutStore } from '../../server/checkout.mjs';
import { checkoutPlans } from '../../config/checkout-plans.mjs';
import { planFeatures, priceLabel } from '../../config/plans.mjs';
import { Navigation, Footer } from '../../components/Experience';
import CardCheckout from '../CardCheckout';
import styles from '../Checkout.module.css';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Checkout | Marquesano', robots: { index: false, follow: false } };

export default async function CheckoutPage({ params }) {
  const { plan: code } = await params;
  if (!Object.hasOwn(checkoutPlans, code)) notFound();
  const definition = checkoutPlans[code];
  let plan;
  try { plan = await (await checkoutStore()).repository.plans.get(definition.storedId); }
  catch (error) {
    if (process.env.NODE_ENV === 'development') console.info('CHECKOUT_LOCAL_DATABASE', { stage: 'CATALOG_READ_FAILED', name: ['Error','TypeError'].includes(error.name) ? error.name : 'DatabaseError', code: /^[A-Z0-9_]{2,40}$/.test(error.code || '') ? error.code : undefined });
  }
  const diagnostics = process.env.NODE_ENV === 'development';
  if (diagnostics) console.info('CHECKOUT_LOCAL_PLAN', { plan_code_received: code, plan_found: Boolean(plan), price_found: Number.isSafeInteger(plan?.monthly_price_cents) && plan.monthly_price_cents > 0, mercado_pago_public_key_available: Boolean(process.env.MERCADOPAGO_PUBLIC_KEY?.trim()) });
  return <main className={styles.shell}><Navigation commercial />
    <div className={styles.content}><span className="eyebrow">MARQUESANO / CHECKOUT</span><h1 className={styles.heading}>Seu próximo passo começa aqui.</h1>
      <div className={styles.grid}>
        <section className={styles.panel}><h2>Plano {definition.name}</h2>
          <p className={styles.price}>{plan?.monthly_price_cents != null ? priceLabel(plan.monthly_price_cents) : 'Valor indisponível'}<small> / mês</small></p>
          <p className={styles.highlight}>Plano com duração de 12 meses, cobrado mensalmente.</p>
          <ul className={styles.list}>{(planFeatures[definition.storedId] || []).map(feature => <li key={feature}>{feature}</li>)}</ul>
          <dl className={styles.facts}><div><dt>Duração do contrato</dt><dd>12 meses</dd></div><div><dt>Cobrança</dt><dd>Mensal recorrente</dd></div><div><dt>Total de cobranças</dt><dd>12</dd></div><div><dt>Valor mensal</dt><dd>{plan?.monthly_price_cents != null ? priceLabel(plan.monthly_price_cents) : 'Indisponível'}</dd></div></dl>
          <p className={styles.detail}>Os pagamentos serão processados de forma recorrente pelo Mercado Pago.</p>
        </section>
        <section className={styles.panel}><h2>Concluir assinatura</h2>
          <p className={styles.detail}>Pagamento com cartão processado pelo Mercado Pago. Esta contratação é uma assinatura recorrente.</p>
          <CardCheckout code={code} revision={plan?.revision} amount={plan?.monthly_price_cents} publicKey={process.env.MERCADOPAGO_PUBLIC_KEY || ''} diagnostics={diagnostics} />
        </section>
      </div>
    </div><Footer /></main>;
}
