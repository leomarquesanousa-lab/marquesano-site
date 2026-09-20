import { Navigation } from "../components/Experience";
import MainFooter from "../components/MainFooter";
import { pageMetadata } from "../config/metadata";
import styles from "../politica-de-privacidade/privacy.module.css";

export const metadata = {
  ...pageMetadata("/exclusao-de-dados", "Exclusão de Dados | Marquesano", "Instruções para solicitar a exclusão de dados e revogar integrações vinculadas à Marquesano."),
  robots: { index: true, follow: true },
};

const sections = [
  ["como-solicitar", "Como solicitar"], ["meta", "Meta, Facebook e Instagram"],
  ["dados", "Dados que podem ser excluídos"], ["prazo", "Prazo"],
  ["excecoes", "Exceções"], ["confirmacao", "Confirmação"], ["contato", "Contato"],
];

export default function DataDeletionPage() {
  return <div className="commercialPage">
    <Navigation commercial/>
    <main>
      <header className={`commercialHero ${styles.hero}`}>
        <span className="eyebrow">MARQUESANO / SEUS DADOS</span>
        <h1>Exclusão de Dados</h1>
        <p>Você pode solicitar a exclusão de dados associados aos serviços da Marquesano, incluindo informações de integrações autorizadas.</p>
        <p className={styles.updated}>Última atualização: <time dateTime="2026-09">Setembro de 2026</time></p>
      </header>
      <div className={styles.layout}>
        <aside className={styles.sidebar}><nav aria-label="Nesta página"><h2>Nesta página</h2><ol>{sections.map(([id, label]) => <li key={id}><a href={`#${id}`}>{label}</a></li>)}</ol></nav></aside>
        <article className={styles.article} aria-label="Instruções de exclusão de dados da Marquesano">
          <section id="como-solicitar" className={styles.deletion}><span className="eyebrow">SOLICITAÇÃO POR E-MAIL</span><h2>Como solicitar</h2><p>Envie sua solicitação para <a href="mailto:suporte@marquesano.com.br?subject=Exclus%C3%A3o%20de%20dados">suporte@marquesano.com.br</a>, preferencialmente com o assunto <strong>“Exclusão de dados”</strong>. Não é necessário entrar no painel para fazer o pedido.</p><p>Informe:</p><ul><li>Seu nome.</li><li>O e-mail associado ao serviço ou à conta.</li><li>Qual serviço, conta ou integração deseja remover.</li><li>Informações suficientes para localizar os dados, como o identificador da conta de anúncios ou o site relacionado, quando aplicável.</li></ul><p><strong>Não envie senhas nem tokens de acesso.</strong> Podemos solicitar informações adicionais mínimas para confirmar sua identidade e sua relação com a conta, evitando a exclusão indevida de dados de terceiros.</p></section>
          <section id="meta"><h2>Dados da Meta, Facebook e Instagram</h2><p>Se você autorizou uma conexão com Facebook, Instagram ou Meta Ads, pode solicitar por e-mail a remoção dos dados dessa integração armazenados pela Marquesano. Identifique a conta ou integração no pedido.</p><p>Você também pode revogar a autorização diretamente nas configurações da própria conta Meta/Facebook, na área de aplicativos ou integrações comerciais: localize o aplicativo vinculado à Marquesano e utilize a opção de remoção. Os nomes e a localização dessas opções podem variar conforme a plataforma.</p><p>Após a revogação, a Marquesano deixará de usar o token correspondente para consultar a integração revogada. Tokens e dados associados mantidos pela Marquesano serão removidos conforme aplicável ao pedido de exclusão e às exceções descritas nesta página.</p><p>A revogação da autorização e a exclusão de dados já armazenados são procedimentos distintos. Para solicitar a remoção desses dados, envie o pedido por e-mail, mesmo que já tenha removido a autorização na Meta. Isso não exclui sua conta do Facebook ou Instagram nem dados mantidos diretamente pela Meta.</p></section>
          <section id="dados"><h2>Tipos de dados que podem ser excluídos</h2><p>Conforme o serviço utilizado e os dados efetivamente armazenados, a solicitação pode abranger:</p><ul><li>Identificadores da conta autorizada.</li><li>Tokens de acesso armazenados para a integração.</li><li>Referências às contas de anúncios selecionadas no serviço.</li><li>Dados derivados da integração, como relatórios e métricas armazenados.</li><li>Informações de contato fornecidas ao site.</li><li>Dados administrativos relacionados ao serviço, quando aplicável.</li></ul><p>A remoção de uma referência a uma conta de anúncios na Marquesano não exclui a própria conta na plataforma de origem.</p></section>
          <section id="prazo"><h2>Prazo</h2><p>As solicitações serão analisadas e processadas em prazo razoável, considerando a identificação dos dados, a verificação necessária e a complexidade do pedido, sujeito às obrigações legais e às necessidades de segurança. Prazos legalmente aplicáveis serão observados.</p><p>Se forem necessários esclarecimentos ou houver impedimento para concluir alguma etapa, entraremos em contato pelo e-mail informado.</p></section>
          <section id="excecoes"><h2>Exceções</h2><p>Alguns dados poderão ser mantidos quando houver justificativa aplicável, pelo período necessário para:</p><ul><li>Cumprimento de obrigações legais.</li><li>Prevenção de fraude e proteção da segurança.</li><li>Resolução de disputas.</li><li>Manutenção de registros financeiros ou contratuais necessários.</li></ul><p>Essas hipóteses não justificam a retenção indiscriminada de informações. Quando houver retenção, informaremos os motivos e o alcance da limitação, quando permitido.</p></section>
          <section id="confirmacao"><h2>Confirmação</h2><p>Você poderá receber uma confirmação por e-mail quando a solicitação for concluída, com informações sobre as providências adotadas e eventuais exceções à exclusão.</p><p>Para conhecer as demais práticas de tratamento de informações da Marquesano, consulte a <a href="https://marquesano.com.br/politica-de-privacidade">Política de Privacidade</a>.</p></section>
          <section id="contato"><h2>Contato</h2><address className={styles.contact}><strong>Marquesano</strong><a href="https://marquesano.com.br">https://marquesano.com.br</a><a href="mailto:suporte@marquesano.com.br">suporte@marquesano.com.br</a></address></section>
        </article>
      </div>
    </main>
    <MainFooter/>
  </div>;
}
