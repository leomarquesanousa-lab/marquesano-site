import { Navigation, Footer, Photo, Form, Arrow } from "./Experience";
import QuarterlyReview from "./QuarterlyReview";

export const projects = [
  { name: "Clínica Aurora", category: "SAÚDE & BEM-ESTAR", route: "clinica", image: "4266936", text: "Uma presença acolhedora, do primeiro olhar ao agendamento.", tone: "mint" },
  { name: "Black House", category: "ESTILO & CUIDADO", route: "barbearia", image: "12505400", text: "Personalidade vintage. Uma experiência que respeita o seu tempo.", tone: "bronze" },
  { name: "Casa Sapore", category: "GASTRONOMIA", route: "restaurante", image: "67468", text: "Um convite à mesa, com atmosfera e sabor em cada detalhe.", tone: "wine" },
  { name: "Bosque Store", category: "COMÉRCIO LOCAL", route: "comercio", image: "3738387", text: "Uma curadoria de objetos e uma vitrine feita para explorar.", tone: "olive" }
];

export function ProjectGrid() { return <div className="projectGrid">{projects.map((p, i) => <a className={`projectItem ${p.tone}`} key={p.route} href={`/exemplos/${p.route}`}><div className="projectImage"><Photo id={p.image} alt={p.name}/><span className="projectVisit">Explorar projeto <Arrow/></span></div><div className="projectCaption"><span className="eyebrow">0{i + 1} / {p.category}</span><h3>{p.name}<span>↗</span></h3><p>{p.text}</p></div></a>)}</div>; }

export function Plans() { return <><div className="refinedPlans">{[["Essencial", "99", "O primeiro passo para uma presença profissional.", ["Site responsivo", "Domínio .com.br sujeito à disponibilidade", "Hospedagem e SSL", "WhatsApp e formulário", "Manutenção"]], ["Profissional", "149", "Mais espaço para apresentar o valor do seu negócio.", ["Tudo do Essencial", "Mais páginas e seções", "Galeria e depoimentos", "Analytics e SEO local", "Alterações mensais"]], ["Business", "249", "Uma experiência conectada à sua operação.", ["Tudo do Profissional", "Agendamento", "Formulários avançados", "Integrações", "Recursos sob medida"]]].map(([name, price, desc, features], i) => <article className={i === 1 ? "planRecommended" : ""} key={name}><span className="eyebrow">{i === 1 ? "PARA IR ALÉM" : `PLANO 0${i + 1}`}</span><h3>{name}</h3><p>{desc}</p><div className="refinedPrice"><span>R$</span><strong>{price}</strong><span>/mês</span></div><a className="refinedBtn" href={`/contato?plano=${name}`}>Escolher {name}<Arrow/></a><ul>{features.map(f => <li key={f}>✓ {f}</li>)}</ul></article>)}</div><p className="termsNote">Criação incluída · Contrato de 12 meses · Domínio sujeito à disponibilidade. Escopo e condições definidos na proposta.</p></>; }

const headings = {
  servicos: ["DESIGN, TECNOLOGIA & CUIDADO", "Seu negócio tem valor. Seu site precisa mostrar.", "Da primeira conversa ao acompanhamento contínuo: uma presença digital pensada para quem precisa cuidar do próprio negócio."],
  portfolio: ["PORTFÓLIO / EXPERIÊNCIAS DEMONSTRATIVAS", "Quatro negócios. Quatro personalidades.", "Explore os projetos, navegue pelos menus e experimente os formulários. Cada segmento merece sua própria linguagem."],
  planos: ["UM INVESTIMENTO QUE FAZ SENTIDO", "Seu próximo capítulo começa aqui.", "Criação, hospedagem e acompanhamento em uma mensalidade. Escolha a estrutura que combina com o momento do seu negócio."],
  sobre: ["POR TRÁS DE CADA DETALHE", "Bons negócios merecem ser bem apresentados.", "A SuaMarca aproxima pequenos negócios de uma presença digital cuidada, clara e profissional."],
  contato: ["VAMOS CONVERSAR", "O próximo bom projeto pode ser o seu.", "Conte sobre seu negócio e o que você imagina para ele. Começamos pelo mais importante: entender o que você precisa."]
};

export default function Commercial({ page }) {
  const [eyebrow, title, text] = headings[page];
  return <main className={`commercialPage commercial-${page}`}><Navigation commercial/><section className="commercialHero"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{text}</p><span className="heroIndex">SUAMARCA / {page.toUpperCase()}</span></section><div className="commercialBody">
    {page === "portfolio" && <ProjectGrid/>}
    {page === "planos" && <Plans/>}
    {page === "servicos" && <><div className="serviceEditorial">{[["01", "Design com identidade", "Composição, cores e tipografia que dão personalidade ao seu negócio. Uma experiência confortável em telas grandes e pequenas."], ["02", "Estrutura para gerar contatos", "Páginas claras, formulários e chamadas bem posicionadas. Do interesse inicial ao próximo passo, sem complicação."], ["03", "Tecnologia bem cuidada", "Hospedagem, domínio e SSL reunidos em uma estrutura acompanhada. Seu site pronto para receber visitantes."], ["04", "Acompanhamento contínuo", "Manutenção e suporte para o site acompanhar o negócio. Alterações e integrações de acordo com o plano contratado."]].map(([n, t, p]) => <article key={n}><span>{n}</span><h2>{t}</h2><p>{p}</p></article>)}</div><div className="processBand"><span className="eyebrow">DO BRIEFING AO SITE ONLINE</span><h2>Um processo claro, do início ao próximo passo.</h2><ol><li>Entendemos seu negócio</li><li>Apresentamos o design</li><li>Ajustamos juntos</li><li>Publicamos e acompanhamos</li></ol></div></>}
    {page === "sobre" && <div className="aboutEditorial"><div className="aboutMonogram" aria-hidden="true">S<span>Design que aproxima.</span></div><div><span className="eyebrow">NOSSA MANEIRA DE TRABALHAR</span><h2>Menos complicação.<br/>Mais cuidado.</h2><p>Acreditamos que um site deve explicar bem o que você faz, transmitir confiança e facilitar o contato. Cada escolha visual tem uma função.</p><p>Trabalhamos com uma proposta de assinatura para reunir criação e acompanhamento. Assim, a presença digital deixa de ser uma tarefa solta na rotina do empreendedor.</p><p>Os projetos deste portfólio são demonstrações de possibilidades para diferentes segmentos. Marcas, depoimentos e informações dos exemplos são fictícios.</p><a className="refinedBtn" href="/portfolio">Conhecer o trabalho<Arrow/></a></div></div>}
    {page === "contato" && <div className="contactEditorial"><aside><span className="eyebrow">COMECE POR UMA CONVERSA</span><h2>Um bom site começa com boas perguntas.</h2><p>Qual é o seu segmento? Quem você quer alcançar? O que seus clientes precisam encontrar?</p><div className="contactSteps"><p><b>01</b> Conte sua ideia</p><p><b>02</b> Defina o escopo</p><p><b>03</b> Escolha seu plano</p></div><p className="formNote">Este formulário demonstra a experiência de contato. O canal comercial será ativado com os dados reais de atendimento.</p></aside><ContactForm/></div>}
    {(page === "servicos" || page === "planos") && <QuarterlyReview/>}
    {page !== "contato" && <section className="commercialClosing"><div><span className="eyebrow">SEU NEGÓCIO, BEM APRESENTADO</span><h2>Vamos construir sua presença?</h2></div><a className="refinedBtn" href="/contato">Conversar sobre meu site<Arrow/></a></section>}
  </div><Footer/></main>;
}

function ContactForm() { return <Form options={["Quero conhecer os planos", "Essencial", "Profissional", "Business", "Projeto sob medida"]} title="Preparar meu pedido"/>; }
