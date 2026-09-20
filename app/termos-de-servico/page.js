import { Navigation } from "../components/Experience";
import MainFooter from "../components/MainFooter";
import { pageMetadata } from "../config/metadata";
import styles from "../politica-de-privacidade/privacy.module.css";

export const metadata = {
  ...pageMetadata("/termos-de-servico", "Termos de Serviço | Marquesano", "Termos aplicáveis ao uso do site, serviços digitais e integrações oferecidas pela Marquesano."),
  robots: { index: true, follow: true },
};

const sections = [
  ["aceitacao", "Aceitação dos termos"], ["servicos", "Serviços"],
  ["uso-permitido", "Uso permitido"], ["credenciais", "Contas e credenciais"],
  ["integracoes", "Integrações de terceiros"], ["meta", "Meta Marketing API"],
  ["propriedade-intelectual", "Propriedade intelectual"], ["responsabilidades", "Responsabilidades do usuário"],
  ["limites", "Limitação de responsabilidade"], ["encerramento", "Suspensão e encerramento"],
  ["privacidade", "Privacidade"], ["exclusao", "Exclusão de dados"],
  ["alteracoes", "Alterações dos termos"], ["contato", "Contato"],
];

export default function TermsPage() {
  return <div className="commercialPage">
    <Navigation commercial/>
    <main>
      <header className={`commercialHero ${styles.hero}`}>
        <span className="eyebrow">MARQUESANO / TERMOS</span>
        <h1>Termos de Serviço</h1>
        <p>Condições de uso do site, dos serviços digitais e das integrações da Marquesano.</p>
        <p className={styles.updated}>Última atualização: <time dateTime="2026-09">Setembro de 2026</time></p>
      </header>
      <div className={styles.layout}>
        <aside className={styles.sidebar}><nav aria-label="Nestes termos"><h2>Nestes termos</h2><ol>{sections.map(([id, label]) => <li key={id}><a href={`#${id}`}>{label}</a></li>)}</ol></nav></aside>
        <article className={styles.article} aria-label="Termos de Serviço da Marquesano">
          <section id="aceitacao"><h2>Aceitação dos termos</h2><p>Ao acessar o site ou contratar ou utilizar os serviços da Marquesano, você concorda com estes termos, conforme aplicáveis ao uso realizado. Leia as condições antes de utilizar os serviços e entre em contato se precisar de esclarecimentos.</p><p>Propostas e contratos específicos podem definir escopo, valores, prazos e condições adicionais para cada contratação, respeitados os direitos previstos na legislação aplicável.</p></section>
          <section id="servicos"><h2>Serviços</h2><p>A Marquesano atua na criação e manutenção de sites, serviços digitais, marketing, analytics e integrações com plataformas externas. Quando contratado e disponível, o serviço também pode incluir gerenciamento e análise de campanhas.</p><p>Os recursos oferecidos dependem do serviço contratado, das autorizações concedidas e da disponibilidade técnica das plataformas envolvidas.</p></section>
          <section id="uso-permitido"><h2>Uso permitido</h2><p>Ao utilizar nossos serviços, você se compromete a:</p><ul><li>Fornecer informações verdadeiras e mantê-las atualizadas quando necessário.</li><li>Não utilizar o site ou os serviços para atividades ilegais, fraudulentas ou abusivas.</li><li>Não tentar acessar áreas, sistemas, contas ou dados sem autorização.</li><li>Respeitar os direitos de terceiros, incluindo privacidade e propriedade intelectual.</li></ul></section>
          <section id="credenciais"><h2>Contas e credenciais</h2><p>Quando houver contas administrativas ou integrações, você é responsável por proteger suas credenciais e conceder acesso apenas a pessoas autorizadas. Comunique suspeitas de uso indevido ou acesso não autorizado a <a href="mailto:suporte@marquesano.com.br">suporte@marquesano.com.br</a>.</p><p>Nas integrações oficiais que utilizam OAuth, a autorização ocorre diretamente na plataforma conectada. A Marquesano não solicita sua senha de redes sociais para realizar essa autorização. Não envie senhas ou tokens pelos canais de atendimento.</p></section>
          <section id="integracoes"><h2>Integrações de terceiros</h2><p>Os serviços podem se integrar à Meta, Facebook, Instagram, Google Analytics, Google Search Console e a outros provedores. Essas plataformas possuem termos e políticas próprios, que também se aplicam ao uso dos respectivos recursos.</p><p>A disponibilidade e o funcionamento das integrações dependem das APIs, permissões e políticas dos provedores. Alterações, restrições ou interrupções nessas plataformas podem afetar funcionalidades e exigir ajustes.</p></section>
          <section id="meta"><h2>Meta Marketing API</h2><p>Quando você autorizar uma conexão oficial com a Meta, o sistema poderá consultar contas de anúncios, campanhas e métricas disponibilizadas pelas permissões concedidas, como:</p><ul><li>Impressões, alcance e cliques.</li><li>Gastos, custo por clique (CPC) e custo por mil impressões (CPM).</li><li>Taxa de cliques (CTR) e outros dados disponibilizados pela permissão concedida.</li></ul><p>O acesso se limita aos ativos e dados autorizados. A integração de leitura de anúncios não concede acesso a mensagens privadas, senhas ou dados não autorizados, nem autoriza, por si só, a criação ou alteração de campanhas.</p></section>
          <section id="propriedade-intelectual"><h2>Propriedade intelectual</h2><p>Conteúdo, código, design e materiais próprios da Marquesano são protegidos pelos direitos aplicáveis. Seu uso deve respeitar estes termos e as licenças ou condições de contratação correspondentes.</p><p>Materiais fornecidos pelo cliente continuam pertencendo ao cliente ou aos respectivos titulares. O cliente deve possuir as autorizações necessárias para seu uso no serviço. Marcas e materiais de terceiros pertencem aos seus proprietários; condições sobre entregáveis são definidas na contratação.</p></section>
          <section id="responsabilidades"><h2>Responsabilidades do usuário</h2><p>Você é responsável pelo conteúdo que publica ou fornece, pela exatidão das informações enviadas ao sistema e pelas permissões sobre os ativos que conecta. Também deve observar a legislação e as políticas das plataformas aplicáveis às suas campanhas e materiais.</p><p>Essas responsabilidades não afastam as obrigações da Marquesano relativas aos serviços que presta.</p></section>
          <section id="limites"><h2>Limitação de responsabilidade</h2><p>Serviços externos podem ficar indisponíveis, APIs podem mudar e falhas de terceiros podem afetar os recursos oferecidos. A Marquesano buscará tratar os impactos dentro de sua capacidade de atuação e das condições contratadas.</p><p>Não garantimos resultados comerciais específicos, como volume de vendas, posição em buscas ou retorno sobre investimento. Esses resultados dependem de diversos fatores, incluindo mercado, orçamento, conteúdo e decisões das plataformas.</p><p>Estas condições não excluem responsabilidades que não possam ser afastadas por lei nem restringem direitos legalmente assegurados ao usuário.</p></section>
          <section id="encerramento"><h2>Suspensão e encerramento</h2><p>O acesso poderá ser suspenso ou encerrado em caso de uso abusivo, fraude, violação destes termos, risco de segurança ou exigência legal. A medida deverá considerar a gravidade da situação e o necessário para proteger os envolvidos.</p><p>Quando possível e adequado, informaremos o motivo e as providências para regularização. Situações urgentes de segurança ou determinações legais podem exigir ação imediata. O encerramento também observará as condições contratadas e os direitos aplicáveis.</p></section>
          <section id="privacidade"><h2>Privacidade</h2><p>Consulte nossa <a href="https://marquesano.com.br/politica-de-privacidade">Política de Privacidade</a> para saber quais informações podem ser tratadas, suas finalidades, retenção e como exercer seus direitos.</p></section>
          <section id="exclusao"><h2>Exclusão de dados</h2><p>As orientações para solicitar a remoção de informações e revogar integrações estão na página de <a href="https://marquesano.com.br/exclusao-de-dados">Exclusão de Dados</a>.</p></section>
          <section id="alteracoes"><h2>Alterações dos termos</h2><p>Estes termos podem ser atualizados para refletir mudanças nos serviços, nas integrações ou nas exigências aplicáveis. A versão vigente ficará disponível nesta página, com sua data de atualização. Mudanças relevantes serão comunicadas quando necessário, respeitadas as condições contratuais e os direitos aplicáveis.</p></section>
          <section id="contato"><h2>Contato</h2><address className={styles.contact}><strong>Marquesano</strong><a href="https://marquesano.com.br">https://marquesano.com.br</a><a href="mailto:suporte@marquesano.com.br">suporte@marquesano.com.br</a></address></section>
        </article>
      </div>
    </main>
    <MainFooter/>
  </div>;
}
