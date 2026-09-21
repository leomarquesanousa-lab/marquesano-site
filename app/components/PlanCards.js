import { publicPlans } from '../server/plans';
import { Arrow } from './Experience';
import PlanCheckoutButton from './PlanCheckoutButton';
import { checkoutPlans } from '../config/checkout-plans.mjs';

// Presentation names preserve persisted IDs and checkout URLs.
// The legacy "professional" ID belongs to the third (Business) plan.
const presentation = {
  basico: {
    name: 'Básico',
    homeDescription: 'Para colocar um pequeno negócio na internet com qualidade.',
    homeFeatures: ['Criação incluída', 'Site responsivo', 'Domínio .com.br*', 'Hospedagem + SSL', 'WhatsApp e formulário', 'Manutenção'],
    features: ['Site responsivo', 'Domínio .com.br sujeito à disponibilidade', 'Hospedagem e SSL', 'WhatsApp e formulário', 'Manutenção'],
  },
  intermediario: {
    name: 'Professional',
    homeDescription: 'Mais conteúdo, mais presença e mais recursos para vender melhor.',
    homeFeatures: ['Tudo do Básico', 'Mais páginas e seções', 'Galeria e depoimentos', 'Analytics', 'SEO local', 'Alterações mensais'],
    features: ['Tudo do Básico', 'Mais páginas e seções', 'Galeria e depoimentos', 'Analytics e SEO local', 'Alterações mensais'],
  },
  professional: {
    name: 'Business',
    homeDescription: 'Para quem precisa de integrações, formulários e recursos adicionais.',
    homeFeatures: ['Tudo do Professional', 'Agendamento', 'Formulários avançados', 'Integrações', 'Automação básica', 'Recursos sob medida'],
    features: ['Tudo do Professional', 'Agendamento', 'Formulários avançados', 'Integrações', 'Recursos sob medida'],
  },
};

const amount = cents => new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  maximumFractionDigits: 2,
}).format(cents / 100);

export default function PlanCards({ home = false }) {
  return <div className={home ? 'planGrid' : 'refinedPlans'}>{publicPlans().map((plan, i) => {
    const { name, homeDescription, homeFeatures, features } = presentation[plan.id];
    const code = Object.keys(checkoutPlans).find(code => checkoutPlans[code].storedId === plan.id);
    return <article key={plan.id} className={home ? `planCard${i === 1 ? ' featuredPlan' : ''}` : i === 1 ? 'planRecommended' : ''}>
      {home ? <>
        {i === 1 && <span className="mostChosen">MAIS ESCOLHIDO</span>}
        <span className="planName">{name}</span>
      </> : <>
        <span className="eyebrow">{i === 1 ? 'PARA IR ALÉM' : `PLANO 0${i + 1}`}</span>
        <h3>{name}</h3>
      </>}
      <p>{home ? homeDescription : plan.description}</p>
      <div className={home ? 'planPrice' : 'refinedPrice'}>
        {plan.monthly_price_cents == null ? <span>Valor a confirmar</span> : <>
          {home ? <small>R$</small> : <span>R$</span>}
          <strong>{amount(plan.monthly_price_cents)}</strong><span>/mês</span>
        </>}
      </div>
      <PlanCheckoutButton code={code} name={name} revision={plan.revision}
        className={home ? (i === 1 ? 'primaryBtn fullBtn' : 'secondaryBtn darkBtn') : 'refinedBtn'}>
        {!home && <Arrow/>}
      </PlanCheckoutButton>
      <ul>{(home ? homeFeatures : features).map(feature => <li key={feature}>✓ {feature}</li>)}</ul>
    </article>;
  })}</div>;
}
