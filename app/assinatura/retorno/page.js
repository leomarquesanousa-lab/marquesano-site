import { Navigation, Footer } from '../../components/Experience';
import { pageMetadata } from '../../config/metadata';
export const metadata={...pageMetadata("/assinatura/retorno", "Retorno da assinatura | Marquesano", "Orientações para conferir sua assinatura e falar com a Marquesano após o checkout."),robots:{index:false,follow:false}};
export default function SubscriptionReturn() {
  return <main className="commercialPage"><Navigation commercial/><section className="commercialHero"><span className="eyebrow">MARQUESANO / ASSINATURA</span><h1>Confira sua assinatura</h1><p>O retorno a esta página não confirma pagamento nem ativação. Consulte o status e o comprovante na sua conta Mercado Pago. Para acompanhar o início do serviço, fale com a Marquesano.</p><a className="refinedBtn" href="/contato">Falar com a equipe</a></section><Footer/></main>;
}
