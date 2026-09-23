import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { localOnly, testCatalog } from '../../server/admin/mp-homologation.mjs';
import TestCardCheckout from './TestCardCheckout';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Homologação local Mercado Pago', robots: { index: false, follow: false } };
export default async function Page() {
  try { localOnly((await headers()).get('host')); } catch { notFound(); }
  let data;
  try { data = await testCatalog(); } catch { return <main><h1>MODO HOMOLOGAÇÃO MERCADO PAGO — SEM COBRANÇA REAL</h1><p>Configuração de teste indisponível: confira as quatro variáveis, o vendedor e o plano de homologação.</p></main>; }
  return <main style={{ maxWidth: 650, margin: '40px auto', padding: 24 }}><h1>MODO HOMOLOGAÇÃO MERCADO PAGO — SEM COBRANÇA REAL</h1><p>Plano exclusivo de teste: R$ 5/mês, 12 ciclos. Vendedor de teste validado. Não use cartão real.</p><TestCardCheckout code="homologacao" revision={1} {...data}/></main>;
}
