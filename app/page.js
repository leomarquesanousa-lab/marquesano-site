import { pageMetadata } from "./config/metadata";
export const metadata = pageMetadata("/");

import { Navigation, Footer } from "./components/Experience";
import ContactForm from "./components/ContactForm";
import QuarterlyReview from "./components/QuarterlyReview";

const Icon = ({ name, size = 22 }) => {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" };
  const paths = {
    palette: <><circle cx="12" cy="12" r="9"/><circle cx="8" cy="9" r="1"/><circle cx="12" cy="7" r="1"/><circle cx="16" cy="9" r="1"/><path d="M15 16c0 1.4 1.2 2 2.3 1.5C19.6 16.5 21 14.6 21 12"/></>,
    globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.1 4.5 6.1 4.5 9S15 17.9 12 21M12 3C9 6.1 7.5 9.1 7.5 12S9 17.9 12 21"/></>,
    server: <><rect x="4" y="4" width="16" height="6" rx="2"/><rect x="4" y="14" width="16" height="6" rx="2"/><path d="M8 7h.01M8 17h.01M12 7h5M12 17h5"/></>,
    chat: <><path d="M21 12a8 8 0 0 1-8 8H7l-4 2 1.6-4A8 8 0 1 1 21 12Z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/></>,
    wrench: <><path d="M14.7 6.3a4.2 4.2 0 0 0-5.6 5.6L4 17l3 3 5.1-5.1a4.2 4.2 0 0 0 5.6-5.6l-2.3 2.3-2.6-.7-.7-2.6 2.6-2.3Z"/></>,
    headset: <><path d="M4 13v-1a8 8 0 0 1 16 0v1"/><path d="M4 13h3v6H5a1 1 0 0 1-1-1v-5ZM20 13h-3v6h2a1 1 0 0 0 1-1v-5Z"/><path d="M17 19c0 1.1-.9 2-2 2h-3"/></>,
    spark: <><path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3Z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/></>,
    mobile: <><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M10 5h4M11 18h2"/></>,
    target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/></>,
    gear: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1L7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>
  };
  return <svg {...common}>{paths[name]}</svg>;
};

const stripItems = [
  ["palette", "Design", "visual da sua marca"],
  ["globe", "Domínio", "endereço profissional"],
  ["server", "Hospedagem", "site rápido e online"],
  ["chat", "WhatsApp", "contato imediato"],
  ["wrench", "Manutenção", "ajustes contínuos"],
  ["headset", "Suporte", "quando você precisar"]
];

const engineItems = [
  ["spark", "Design profissional", "Identidade visual, composição e acabamento pensados para o segmento do cliente."],
  ["gear", "Tudo incluído", "Domínio, hospedagem, SSL, manutenção e suporte trabalhando como uma única solução."],
  ["mobile", "Pronto para celular", "Experiência confortável e responsiva em qualquer tamanho de tela."],
  ["target", "Feito para gerar contato", "Chamadas para ação, formulários e WhatsApp levando o visitante para o próximo passo."]
];

const examples = [
  {
    tag: "SAÚDE",
    title: "Clínica Aurora",
    text: "Leve, humana e acolhedora.",
    image: "https://images.pexels.com/photos/4266936/pexels-photo-4266936.jpeg?cs=srgb&dl=pexels-cedric-fauntleroy-4266936.jpg&fm=jpg",
    href: "/exemplos/clinica"
  },
  {
    tag: "BARBEARIA",
    title: "Black House",
    text: "Vintage, elegante e marcante.",
    image: "https://images.pexels.com/photos/12505400/pexels-photo-12505400.jpeg?cs=srgb&dl=pexels-theshuttervision-12505400.jpg&fm=jpg",
    href: "/exemplos/barbearia"
  },
  {
    tag: "RESTAURANTE",
    title: "Casa Sapore",
    text: "Chique, moderna e convidativa.",
    image: "https://images.pexels.com/photos/5865286/pexels-photo-5865286.jpeg?cs=srgb&dl=pexels-rachel-claire-5865286.jpg&fm=jpg",
    href: "/exemplos/restaurante"
  },
  {
    tag: "COMÉRCIO LOCAL",
    title: "Bosque Store",
    text: "Sóbria, organizada e confiável.",
    image: "https://images.pexels.com/photos/3738387/pexels-photo-3738387.jpeg?cs=srgb&dl=pexels-polina-tankilevitch-3738387.jpg&fm=jpg",
    href: "/exemplos/comercio"
  }
];

const mosaic = [
  ["https://images.pexels.com/photos/4266936/pexels-photo-4266936.jpeg?cs=srgb&dl=pexels-cedric-fauntleroy-4266936.jpg&fm=jpg", "Clínica"],
  ["https://images.pexels.com/photos/12505400/pexels-photo-12505400.jpeg?cs=srgb&dl=pexels-theshuttervision-12505400.jpg&fm=jpg", "Barbearia"],
  ["https://images.pexels.com/photos/5865286/pexels-photo-5865286.jpeg?cs=srgb&dl=pexels-rachel-claire-5865286.jpg&fm=jpg", "Restaurante"],
  ["https://images.pexels.com/photos/3738387/pexels-photo-3738387.jpeg?cs=srgb&dl=pexels-polina-tankilevitch-3738387.jpg&fm=jpg", "Comércio"]
];

export default function Home() {
  return (
    <main className="home">
      <Navigation commercial/>

      <section className="heroV9">
        <div className="heroV9Image" />
        <div className="heroV9Overlay" />

        <div className="heroV9Inner">
          <div className="heroV9Copy">
            <span className="kicker">SEU NEGÓCIO ONLINE • SEM TAXA DE CRIAÇÃO</span>

            <h1>
              Seu negócio merece um site
              <span> que impressiona.</span>
            </h1>

            <p className="heroLeadV9">
              Criamos sites profissionais para pequenos negócios com design moderno,
              domínio, hospedagem, manutenção e suporte em uma única mensalidade.
            </p>

            <div className="heroPriceV9">
              <div>
                <small>A PARTIR DE</small>
                <strong><span>R$</span>99</strong>
              </div>
              <div className="heroPriceMetaV9">
                <b>/mês</b>
                <span>menos de R$3,30 por dia</span>
              </div>
            </div>

            <div className="heroButtons">
              <a className="primaryBtn" href="#contato">Quero meu site</a>
              <a className="secondaryBtn elegantGhost" href="#portfolio">Ver exemplos</a>
            </div>

            <div className="heroProof elegantProof">
              <span>R$0 de criação</span>
              <span>Domínio incluso*</span>
              <span>Contrato de 12 meses</span>
            </div>
          </div>
        </div>
      </section>

      <section className="serviceStripV12">
        <div className="serviceRail">
          {stripItems.map(([icon, title, text], index) => (
            <article key={title} className="serviceChip">
              <div className="serviceIcon"><Icon name={icon} /></div>
              <div className="serviceChipText">
                <strong>{title}</strong>
                <span>{text}</span>
              </div>
              {index < stripItems.length - 1 && <div className="serviceConnector" />}
            </article>
          ))}
        </div>
      </section>

      <section id="servico" className="mechanismSection">
        <div className="mechanismVisual" />
        <div className="mechanismOverlay" />

        <div className="mechanismInner">
          <div className="mechanismIntro">
            <span className="kicker">A ESTRUTURA POR TRÁS DO SITE</span>
            <h2>Quatro peças trabalhando juntas.</h2>
            <p>
              Além de um bom visual, seu site precisa de estabilidade, boa navegação
              no celular e caminhos claros para transformar visitas em contatos.
            </p>
          </div>

          <div className="mechanismGrid">
            {engineItems.map(([icon, title, text], index) => (
              <article key={title} className="mechanismCard">
                <div className="mechanismNumber">0{index + 1}</div>
                <div className="mechanismIcon"><Icon name={icon} size={28} /></div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="portfolio" className="portfolioCleanV12">
        <div className="portfolioV12Head">
          <div>
            <span className="kicker dark">EXEMPLOS</span>
            <h2>Quatro estilos. Quatro negócios diferentes.</h2>
          </div>
          <p>
            Todos os exemplos abaixo são navegáveis. Abra, clique, teste os menus,
            agendas e formulários e veja como cada nicho pode ter personalidade própria.
          </p>
        </div>

        <div className="portfolioV12Grid">
          {examples.map((item) => (
            <a className="portfolioV12Card" href={item.href} key={item.title}>
              <div className="portfolioV12Image">
                <img src={item.image} alt={item.title} />
                <span className="portfolioV12Tag">{item.tag}</span>
              </div>
              <div className="portfolioV12Info">
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
                <div className="portfolioV12Arrow">↗</div>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="matchSectionV12">
        <div className="matchTechBg" />
        <div className="matchShade" />
        <div className="matchInnerV12">
          <div className="matchCopyV12">
            <span className="kicker">IDENTIDADE VISUAL</span>
            <h2>Seu site precisa combinar com o seu negócio.</h2>
            <p>
              Cores, imagens e linguagem devem refletir a identidade da sua empresa
              e ajudar seus clientes a reconhecer o que torna seu negócio especial.
            </p>
          </div>

          <div className="matchMosaicV12">
            {mosaic.map(([img, label]) => (
              <div className="mosaicCardV12" key={label}>
                <img src={img} alt={label} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <QuarterlyReview/>

      <section id="planos" className="plansSection">
        <div className="sectionIntro center">
          <span className="kicker dark">PLANOS</span>
          <h2>Dê o próximo passo para o seu negócio.</h2>
          <p>Tenha um site profissional para conquistar novos clientes, com criação incluída e planos mensais acessíveis.</p>
        </div>

        <div className="planGrid">
          <article className="planCard">
            <span className="planName">Essencial</span>
            <p>Para colocar um pequeno negócio na internet com qualidade.</p>
            <div className="planPrice"><small>R$</small><strong>99</strong><span>/mês</span></div>
            <a className="secondaryBtn darkBtn" href="/contato?plano=Essencial">Escolher Essencial</a>
            <ul>
              <li>✓ Criação incluída</li>
              <li>✓ Site responsivo</li>
              <li>✓ Domínio .com.br*</li>
              <li>✓ Hospedagem + SSL</li>
              <li>✓ WhatsApp e formulário</li>
              <li>✓ Manutenção</li>
            </ul>
          </article>

          <article className="planCard featuredPlan">
            <span className="mostChosen">MAIS ESCOLHIDO</span>
            <span className="planName">Profissional</span>
            <p>Mais conteúdo, mais presença e mais recursos para vender melhor.</p>
            <div className="planPrice"><small>R$</small><strong>149</strong><span>/mês</span></div>
            <a className="primaryBtn fullBtn" href="/contato?plano=Profissional">Escolher Profissional</a>
            <ul>
              <li>✓ Tudo do Essencial</li>
              <li>✓ Mais páginas e seções</li>
              <li>✓ Galeria e depoimentos</li>
              <li>✓ Analytics</li>
              <li>✓ SEO local</li>
              <li>✓ Alterações mensais</li>
            </ul>
          </article>

          <article className="planCard">
            <span className="planName">Business</span>
            <p>Para quem precisa de integrações, formulários e recursos adicionais.</p>
            <div className="planPrice"><small>R$</small><strong>249</strong><span>/mês</span></div>
            <a className="secondaryBtn darkBtn" href="/contato?plano=Business">Escolher Business</a>
            <ul>
              <li>✓ Tudo do Profissional</li>
              <li>✓ Agendamento</li>
              <li>✓ Formulários avançados</li>
              <li>✓ Integrações</li>
              <li>✓ Automação básica</li>
              <li>✓ Recursos sob medida</li>
            </ul>
          </article>
        </div>

        <p className="legalNote">* Domínio sujeito à disponibilidade e às condições do plano.</p>
      </section>

      <section id="faq" className="section faqSection">
        <div className="sectionIntro left">
          <span className="kicker dark">DÚVIDAS</span>
          <h2>Simples e transparente.</h2>
        </div>

        <div className="faqList">
          <details><summary>Como funciona a revisão trimestral?<span>+</span></summary><p>Nos planos que incluem esse benefício, você tem direito a uma revisão do site com consultoria agendada a cada 3 meses. Podemos avaliar visual, conteúdo, links, botões, formulários e experiência em celular, além de sugerir melhorias para gerar contatos e pequenas recomendações de SEO. O escopo e os ajustes seguem o plano contratado; não se trata de consultoria ilimitada.</p></details>
          <details><summary>Tem taxa de criação?<span>+</span></summary><p>Não. A criação está incluída no serviço mensal.</p></details>
          <details><summary>Por que o contrato é de 12 meses?<span>+</span></summary><p>Porque todo o trabalho inicial de criação e implantação é subsidiado pela empresa.</p></details>
          <details><summary>Posso cancelar antes?<span>+</span></summary><p>Sim, conforme as condições contratuais e eventual cobrança proporcional do benefício inicial concedido.</p></details>
          <details><summary>O domínio está incluído?<span>+</span></summary><p>Um domínio básico .com.br pode ser incluído, sujeito à disponibilidade e às regras do plano.</p></details>
        </div>
      </section>

      <section id="contato" className="finalCtaV12">
        <div className="finalCtaTextV12">
          <span className="kicker">VAMOS COLOCAR SUA EMPRESA ONLINE?</span>
          <h2>Seu site pode começar por R$99/mês.</h2>
          <p>Criação, hospedagem, domínio e acompanhamento contínuo em um único serviço.</p>
          <a className="whiteBtn" href="/contato">Conversar sobre meu projeto</a>
        </div>

        <div className="finalCtaPortrait">
          <img
            src="https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?cs=srgb&dl=pexels-olly-3760263.jpg&fm=jpg"
            alt="Profissional atendendo cliente"
          />
        </div>
      </section>

      <section className="homeContactForm"><div><span className="eyebrow">DO SEU JEITO, DESDE O INÍCIO</span><h2>Conte sua ideia.<br/>Vamos dar o próximo passo.</h2><p>Um espaço para entender seu negócio e a presença que você quer construir.</p></div><ContactForm options={["Essencial", "Profissional", "Business", "Quero orientação"]}/></section>
      <Footer/>
    </main>
  );
}
