import { cookies } from 'next/headers';
import { checkoutStore } from '../../server/checkout.mjs';
import { attemptKey, receiptCookie } from '../../server/admin/card-checkout.mjs';
import { checkoutPlans } from '../../config/checkout-plans.mjs';
import { priceLabel } from '../../config/plans.mjs';
import { pageMetadata } from '../../config/metadata';
import { Navigation, Footer } from '../../components/Experience';
import styles from '../Checkout.module.css';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const metadata = { ...pageMetadata("/checkout/sucesso", "Confirmação de assinatura | Marquesano", "Confira o resultado da contratação do seu plano Marquesano."), robots: { index: false, follow: false } };

export default async function SuccessPage() {
  const receipt = (await cookies()).get(receiptCookie)?.value;
  let attempt;
  try { if (/^[a-f0-9]{64}$/.test(receipt || '')) attempt = await (await checkoutStore()).repository.checkout.get(attemptKey(receipt)); } catch { /* No fabricated confirmation on database failure. */ }
  const confirmed = attempt?.state === 'authorized';
  return <main className={styles.shell}><Navigation commercial /><div className={styles.content}><section className={`${styles.panel} ${styles.success}`}>
    {confirmed ? <><span className={styles.badge}>ASSINATURA CONFIRMADA</span><h1 className={styles.heading}>Bem-vindo à Marquesano.</h1>
      <h2>Plano {checkoutPlans[attempt.plan_code]?.name}</h2><p className={styles.price}>{priceLabel(attempt.amount_cents)}<small> / mês</small></p>
      <p className={styles.highlight}>Status da contratação: autorizada pelo Mercado Pago.</p><p className={styles.detail}>Plano com duração de 12 meses, cobrado mensalmente. São 12 cobranças recorrentes processadas pelo Mercado Pago. A autorização da assinatura não é um comprovante de pagamento das cobranças futuras.</p></> : <><h1>Confirmação indisponível</h1><p className={styles.detail}>Não encontramos uma assinatura confirmada nesta sessão. Se você acabou de contratar, volte ao checkout e use Verificar assinatura antes de tentar novamente.</p></>}
    <a href="/planos" className={styles.button}>Voltar aos planos</a>
  </section></div><Footer /></main>;
}
