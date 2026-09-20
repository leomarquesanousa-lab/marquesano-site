import { notFound } from 'next/navigation';
import { publicPlans } from '../../server/plans';
import { priceLabel } from '../../config/plans.mjs';
import { Navigation, Footer } from '../../components/Experience';
import SubscriptionCheckout from '../../components/SubscriptionCheckout';
export const dynamic='force-dynamic';
export const metadata={title:'Contratar plano | Marquesano',robots:{index:false,follow:false}};
export default async function SubscribePage({params}) {
  const {plan:id}=await params;
  const plan=publicPlans().find(p=>p.id===id);
  if(!plan)notFound();
  return <main className="commercialPage"><Navigation commercial/><section className="commercialHero"><span className="eyebrow">MARQUESANO / ASSINATURA</span><h1>{plan.name}</h1><p>{plan.description}</p></section><div className="commercialBody"><section className="commercialClosing"><div><h2>{priceLabel(plan.monthly_price_cents)}{plan.monthly_price_cents!=null?' / mês':''}</h2><p>{plan.cycles} cobranças mensais. Confira as condições antes de continuar.</p><p><a href="/termos-de-servico">Termos de Serviço</a> · <a href="/politica-de-privacidade">Política de Privacidade</a></p>{plan.available?<><p>A autorização da cobrança recorrente será realizada no Mercado Pago.</p><SubscriptionCheckout plan={plan}/></>:<><p>Este plano ainda não está disponível para contratação online.</p><a className="refinedBtn" href={`/contato?plano=${encodeURIComponent(plan.name)}`}>Consultar condições</a></>}</div></section></div><Footer/></main>;
}
