import { commercialPlans } from '../config/commercial-plans.mjs';
import { publicPlans } from '../server/plans';
import { Arrow } from './Experience';
import PlanCheckoutButton from './PlanCheckoutButton';
import { checkoutPlans } from '../config/checkout-plans.mjs';

// Presentation names preserve persisted IDs and checkout URLs.
// The legacy "professional" ID belongs to the third (Business) plan.
const amount = (cents) => new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  maximumFractionDigits: 2
}).format(cents / 100);

export default async function PlanCards({ home = false }) {
  const billingPlans = await publicPlans();
  return <><div className={home ? 'planGrid' : 'refinedPlans'}>{commercialPlans.map((plan, i) => {
      const { name, description, features } = plan;
      const billing = billingPlans.find(row => row.id === plan.id);
      const canCheckout = !plan.startingAt && billing?.available && billing.monthly_price_cents === plan.price * 100;
      const code = Object.keys(checkoutPlans).find((code) => checkoutPlans[code].storedId === plan.id);
      return <article key={plan.id} className={home ? `planCard${i === 1 ? ' featuredPlan' : ''}` : i === 1 ? 'planRecommended' : ''}>
      <div className="planHeading">{home ? <>
        {i === 1 && <span className="mostChosen">MAIS ESCOLHIDO</span>}
        <span className="planName">{name}</span>
      </> : <>
        <span className="eyebrow">{i === 1 ? 'MAIS ESCOLHIDO' : `PLANO 0${i + 1}`}</span>
        <h3>{name}</h3>
      </>}
      </div>
      <p>{description}</p>
      <div className={home ? 'planPrice' : 'refinedPrice'}>
        {plan.price == null ? <span>Valor a confirmar</span> : <>
          <small className="pricePrefix" aria-hidden={plan.startingAt ? undefined : true}>{plan.startingAt ? 'A partir de' : ''}</small>
          {home ? <small>R$</small> : <span>R$</span>}
          <strong>{amount(plan.price * 100)}</strong><span>/mês</span>
        </>}
      </div>
      {canCheckout ? <PlanCheckoutButton code={code} name={name} revision={billing?.revision}
        className={home ? i === 1 ? 'primaryBtn fullBtn' : 'secondaryBtn darkBtn' : 'refinedBtn'}>
        {!home && <Arrow />}
      </PlanCheckoutButton> : <a className={home ? i === 1 ? 'primaryBtn fullBtn' : 'secondaryBtn darkBtn' : 'refinedBtn'} href="/contato">{plan.startingAt ? 'Solicitar orçamento' : `Contratar ${name}`}{!home && <Arrow />}</a>}
      <ul>{features.map((feature) => <li key={feature}>✓ {feature}</li>)}</ul>
    </article>;
    })}</div><aside className="planConditions" aria-label="Escopo e condições dos planos">
<p>Os planos incluem desenvolvimento e manutenção técnica conforme o escopo contratado. O cliente deverá fornecer textos, imagens, logotipo e demais materiais necessários. Criação de artes, banners, identidade visual, produção de conteúdo e serviços adicionais não estão incluídos, salvo contratação específica.</p>
<p>O domínio incluso é exclusivamente .com.br, sujeito à disponibilidade. Outras extensões não estão incluídas. O suporte técnico cobre problemas de funcionamento do site e dos recursos contratados.</p>
<p>Alterações de conteúdo não equivalem a redesenvolvimento, criação de novas funcionalidades ou reformulação de layout. No Professional, as alterações mensais respeitam os limites e o escopo contratual.</p>
<p>No Business, o preço inicial é de R$ {commercialPlans[2].price} mensais. O valor final depende da complexidade, das funcionalidades e do escopo do projeto. Sistemas ERP, lojas virtuais e integrações avançadas estão sujeitos à avaliação técnica e à aprovação de orçamento personalizado. O preço inicial não inclui irrestritamente qualquer sistema ou funcionalidade.</p>
<p>As condições de contratação e fidelidade seguem a proposta e o contrato.</p>
</aside></>;
}
