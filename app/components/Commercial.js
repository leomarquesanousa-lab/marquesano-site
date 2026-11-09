import ProjectGrid from "./ProjectGrid";
import { commercialPlans } from "../config/commercial-plans.mjs";
import PlanCards from "./PlanCards";
import { Navigation, Footer, Arrow } from "./Experience";
import ContactForm from "./ContactForm";
import QuarterlyReview from "./QuarterlyReview";

export function Plans() {return <><PlanCards /><p className="termsNote">Criação incluída · Domínio .com.br incluso, sujeito à disponibilidade. Escopo e condições definidos na proposta. <a href="/servicos">Conheça os serviços de criação e manutenção de sites</a>.</p></>;}

const headings = {
  servicos: ["DESIGN, TECNOLOGIA & CUIDADO", "Criação de sites profissionais para pequenas empresas.", "Desenvolvimento de sites por assinatura para empresas no Brasil, da primeira conversa à manutenção. Uma presença digital para apresentar seu negócio e facilitar contatos."],
  portfolio: ["PORTFÓLIO / PROJETOS REAIS", "Sites reais desenvolvidos pela Marquesano.", "Conheça Hortoleve, UPOST e Rádio TV Web. Veja capturas reais das páginas e visite os sites publicados."],
  planos: ["UM INVESTIMENTO QUE FAZ SENTIDO", "Planos de criação de site por assinatura.", "Criação, hospedagem e acompanhamento em uma mensalidade. Escolha a estrutura que combina com o momento do seu negócio."],
  sobre: ["POR TRÁS DE CADA DETALHE", "Conheça a Marquesano e nossa forma de criar sites.", "A Marquesano aproxima pequenos negócios de uma presença digital cuidada, clara e profissional."],
  contato: ["VAMOS CONVERSAR", "Converse sobre o site profissional da sua empresa.", "Conte sobre seu negócio e o que você imagina para ele. Começamos pelo mais importante: entender o que você precisa."]
};

export default async function Commercial({ page }) {
  const [eyebrow, title, text] = headings[page];
  return <main className={`commercialPage commercial-${page}`}><Navigation commercial /><section className="commercialHero"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{text}</p><span className="heroIndex">MARQUESANO / {page.toUpperCase()}</span></section><div className="commercialBody">
    {page === "portfolio" && <ProjectGrid />}
    {page === "planos" && <Plans />}
    {page === "servicos" && <><div className="serviceEditorial">{[["01", "Design de site com identidade", "Composição, cores e tipografia que dão personalidade ao seu negócio. Uma experiência confortável em telas grandes e pequenas."], ["02", "Estrutura para gerar contatos", "Páginas claras, formulários e chamadas bem posicionadas. Do interesse inicial ao próximo passo, sem complicação."], ["03", "Tecnologia moderna", "Sites rápidos, responsivos e desenvolvidos com tecnologias modernas para uma boa experiência em qualquer dispositivo."], ["04", "Manutenção de site e suporte", "Manutenção e suporte para o site acompanhar o negócio. Alterações e integrações de acordo com o plano contratado."]].map(([n, t, p]) => <article key={n}><span>{n}</span><h2>{t}</h2><p>{p}</p></article>)}</div><div className="processBand"><span className="eyebrow">DO BRIEFING AO SITE ONLINE</span><h2>Um processo claro, do início ao próximo passo.</h2><ol><li>Entendemos seu negócio</li><li>Apresentamos o design</li><li>Ajustamos juntos</li><li>Publicamos e acompanhamos</li></ol><p>Hospedagem e suporte acompanham o site por assinatura. Domínio, manutenção e limites de alterações seguem as condições do plano. O prazo de entrega é combinado na proposta, conforme o escopo e o envio de conteúdo.</p><p>Compare os <a href="/planos">planos de site por assinatura</a> e explore <a href="/portfolio">projetos reais desenvolvidos pela Marquesano</a>.</p></div></>}
    {page === "sobre" && <div className="aboutEditorial"><div className="aboutMonogram" aria-hidden="true"><img src="/images/mazul.png" alt="" /><span>Design que aproxima.</span></div><div><span className="eyebrow">NOSSA MANEIRA DE TRABALHAR</span><h2>Menos complicação.<br />Mais cuidado.</h2><p>Acreditamos que um site deve explicar bem o que você faz, transmitir confiança e facilitar o contato. Cada escolha visual tem uma função.</p><p>Trabalhamos com uma proposta de assinatura para reunir criação e acompanhamento. Assim, a presença digital deixa de ser uma tarefa solta na rotina do empreendedor.</p><p>Nosso portfólio reúne sites reais desenvolvidos pela Marquesano, com apresentações institucionais, catálogos e portais de comunicação.</p><a className="refinedBtn" href="/portfolio">Conhecer o trabalho<Arrow /></a></div></div>}
    {page === "contato" && <div className="contactEditorial"><aside><span className="eyebrow">COMECE POR UMA CONVERSA</span><h2>Um bom site começa com boas perguntas.</h2><p>Qual é o seu segmento? Quem você quer alcançar? O que seus clientes precisam encontrar?</p><div className="contactSteps"><p><b>01</b> Conte sua ideia</p><p><b>02</b> Defina o escopo</p><p><b>03</b> Escolha seu plano</p></div><p className="formNote">Envie sua mensagem pelo formulário ou fale diretamente com nossa equipe pelo WhatsApp.</p></aside><ContactForm options={["Quero conhecer os planos", ...commercialPlans.map((plan) => plan.name), "Projeto sob medida"]} /></div>}
    {(page === "servicos" || page === "planos") && <QuarterlyReview />}
    {page !== "contato" && <section className="commercialClosing"><div><span className="eyebrow">SEU NEGÓCIO, BEM APRESENTADO</span><h2>Vamos construir sua presença?</h2></div><a className="refinedBtn" href="/contato">Conversar sobre meu site<Arrow /></a></section>}
  </div><Footer /></main>;
}
