import { publicPlans } from '../server/plans';
import { planFeatures, priceLabel } from '../config/plans.mjs';

export default function PlanCards({ home=false }) {
  const plans=publicPlans();
  return <div className={home?'planGrid':'refinedPlans'}>{plans.map((plan,i)=><article key={plan.id} className={home?`planCard ${i===1?'featuredPlan':''}`:i===1?'planRecommended':''}>
    {home?<span className="planName">{plan.name}</span>:<><span className="eyebrow">PLANO 0{i+1}</span><h3>{plan.name}</h3></>}
    <p>{plan.description}</p>
    {plan.monthly_price_cents==null?<p>Valor a confirmar</p>:<div className={home?'planPrice':'refinedPrice'} style={{flexWrap:'wrap'}}><strong style={{fontSize:'clamp(24px,3vw,42px)',overflowWrap:'anywhere'}}>{priceLabel(plan.monthly_price_cents)}</strong><span>/mês</span></div>}
    <p>{plan.cycles} cobranças mensais</p>
    <a className={home?(i===1?'primaryBtn fullBtn':'secondaryBtn darkBtn'):'refinedBtn'} href={`/assinar/${plan.id}`}>{plan.available?'Contratar':'Consultar'} {plan.name}</a>
    <ul>{planFeatures[plan.id].map(feature=><li key={feature}>✓ {feature}</li>)}</ul>
  </article>)}</div>;
}
