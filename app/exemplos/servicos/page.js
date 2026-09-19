import { getWhatsAppUrl } from "../../config/whatsapp";
import { Form, Navigation } from "../../components/Experience";
export default function Servicos() {
  return (
    <main className="bizPage serviceTheme">
      <div className="demoTop">
        <a href="/">← Voltar para Marquesano</a>
        <span>DEMONSTRAÇÃO • SERVIÇOS</span>
      </div>

      <Navigation brand="ProntoFix" home="/exemplos/servicos" links={[["Início", "#inicio"], ["Serviços", "#servicos"], ["Vantagens", "#vantagens"], ["Contato", "#formulario"]]} action="#formulario" actionLabel="Pedir orçamento"/>

      <section id="inicio" className="bizHero">
        <div>
          <span className="bizKicker">AGILIDADE • CONFIANÇA • SOLUÇÃO</span>
          <h1>Quando você precisa, a gente resolve.</h1>
          <p>
            Serviços residenciais e comerciais com atendimento rápido,
            comunicação simples e orçamento direto.
          </p>
          <div className="bizActions">
            <a className="bizBtn" href="#contato">Pedir orçamento</a>
            <a className="bizLink" href="#servicos">Ver serviços →</a>
          </div>
        </div>
        <div className="bizHeroImage">
          <img src="https://images.pexels.com/photos/8486972/pexels-photo-8486972.jpeg?cs=srgb&dl=pexels-anete-lusina-8486972.jpg&fm=jpg" alt="Profissional de serviços"/>
        </div>
      </section>

      <section id="servicos" className="bizSection">
        <span className="bizKicker">SERVIÇOS</span>
        <h2>Atendimento prático para o dia a dia.</h2>
        <div className="bizCards">
          <article><h3>Elétrica</h3><p>Instalações, reparos e manutenção com segurança.</p></article>
          <article><h3>Hidráulica</h3><p>Vazamentos, trocas e soluções rápidas para sua necessidade.</p></article>
          <article><h3>Manutenção</h3><p>Pequenos reparos e suporte sob demanda.</p></article>
        </div>
      </section>

      <section id="vantagens" className="bizSplit">
        <div className="bizSplitImage">
          <img src="https://images.pexels.com/photos/8292797/pexels-photo-8292797.jpeg?cs=srgb&dl=pexels-kampus-8292797.jpg&fm=jpg" alt="Atendimento profissional"/>
        </div>
        <div className="bizSplitCopy">
          <span className="bizKicker">POR QUE ESCOLHER</span>
          <h2>Profissionalismo desde o primeiro contato.</h2>
          <p>
            Um site simples e bem estruturado ajuda o cliente a confiar,
            pedir orçamento e entender rapidamente o que você faz.
          </p>
          <ul className="bizChecklist">
            <li>✓ Orçamento rápido</li>
            <li>✓ Atendimento claro</li>
            <li>✓ Comunicação por WhatsApp</li>
          </ul>
        </div>
      </section>

      <section id="contato" className="bizCta">
        <div>
          <h2>Solicite um orçamento.</h2>
          <p>Envie sua necessidade pelo WhatsApp e receba retorno rápido.</p>
        </div>
        <a className="bizBtn light" href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer">Falar pelo WhatsApp</a>
      </section>
      <section id="formulario" className="experienceContact"><div><h2>Conte o que precisa resolver.</h2><p>Formulário demonstrativo de orçamento.</p></div><Form title="Preparar orçamento"/></section>
    </main>
  );
}
