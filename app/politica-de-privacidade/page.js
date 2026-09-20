import { Navigation } from "../components/Experience";
import MainFooter from "../components/MainFooter";
import { pageMetadata } from "../config/metadata";
import styles from "./privacy.module.css";

export const metadata = {
  ...pageMetadata("/politica-de-privacidade", "Política de Privacidade | Marquesano", "Saiba como a Marquesano coleta, utiliza e protege informações, como funcionam as integrações autorizadas e como solicitar a exclusão dos seus dados."),
  robots: { index: true, follow: true },
};

const sections = [
  ["quem-somos", "Quem somos"],
  ["informacoes-coletadas", "Informações coletadas"],
  ["finalidades", "Como usamos os dados"],
  ["cookies", "Cookies e navegação"],
  ["google", "Serviços do Google"],
  ["meta", "Meta, Facebook e Instagram"],
  ["compartilhamento", "Compartilhamento"],
  ["seguranca", "Segurança e retenção"],
  ["direitos", "Seus direitos"],
  ["exclusao-de-dados", "Exclusão de dados"],
  ["revogacao-meta", "Revogação da Meta"],
  ["menores", "Crianças e adolescentes"],
  ["alteracoes", "Alterações desta política"],
  ["contato", "Contato"],
];

export default function PrivacyPage() {
  return <div className="commercialPage">
    <Navigation commercial/>
    <main id="conteudo-privacidade">
      <header className={`commercialHero ${styles.hero}`}>
        <span className="eyebrow">MARQUESANO / PRIVACIDADE</span>
        <h1>Política de Privacidade</h1>
        <p>Transparência sobre as informações que utilizamos e as escolhas que você pode fazer.</p>
        <p className={styles.updated}>Última atualização: <time dateTime="2026-09">Setembro de 2026</time></p>
      </header>
      <div className={styles.layout}>
        <aside className={styles.sidebar}><nav aria-label="Nesta política"><h2>Nesta política</h2><ol>{sections.map(([id,label])=><li key={id}><a href={`#${id}`}>{label}</a></li>)}</ol></nav></aside>
        <article className={styles.article} aria-label="Política de Privacidade da Marquesano">
          <section id="quem-somos"><h2>Quem somos</h2><p>A Marquesano atua na criação de sites, marketing digital e serviços relacionados. Esta política explica o tratamento de informações no site <a href="https://marquesano.com.br">marquesano.com.br</a>, no atendimento e nas integrações utilizadas para prestar nossos serviços.</p><p>As informações tratadas dependem de como você utiliza o site, dos serviços solicitados e das integrações que autoriza.</p></section>

          <section id="informacoes-coletadas"><h2>Informações que podem ser coletadas</h2><ul>
            <li><strong>Dados informados por você:</strong> nome, e-mail, telefone ou WhatsApp, empresa, serviço de interesse e conteúdo de mensagens enviadas em formulários ou canais de atendimento.</li>
            <li><strong>Dados técnicos de navegação:</strong> endereço IP, tipo de navegador e dispositivo, datas e horários de acesso, páginas acessadas, eventos de uso, origem das visitas e parâmetros de campanha, como UTM. Algumas dessas informações podem ser processadas pela infraestrutura de hospedagem ou por serviços de analytics.</li>
            <li><strong>Cookies e tecnologias similares:</strong> identificadores e informações usados para funcionamento, segurança, medição de audiência e atribuição de visitas.</li>
            <li><strong>Integrações autorizadas:</strong> identificação de contas, permissões concedidas e dados disponibilizados pelas plataformas conectadas, dentro do escopo autorizado pelo usuário.</li>
          </ul><p>Evite enviar senhas, tokens, dados de pagamento ou informações pessoais sensíveis nos campos de mensagem.</p></section>

          <section id="finalidades"><h2>Como usamos os dados</h2><p>Utilizamos as informações, conforme a finalidade e a base legal aplicável, para:</p><ul>
            <li>Responder a solicitações, elaborar propostas e prestar os serviços contratados.</li>
            <li>Oferecer suporte e manter a comunicação com clientes e interessados.</li>
            <li>Medir o uso do site, compreender a origem das visitas e melhorar conteúdo, desempenho e experiência de navegação.</li>
            <li>Acompanhar campanhas e apresentar métricas de contas conectadas com autorização.</li>
            <li>Proteger o site, as contas e os serviços contra falhas, fraudes e acessos indevidos.</li>
            <li>Cumprir obrigações legais e atender solicitações válidas de autoridades competentes.</li>
          </ul></section>

          <section id="cookies"><h2>Cookies e tecnologias de navegação</h2><p>O site pode utilizar cookies e tecnologias similares para manter recursos funcionando, proteger sessões e registrar informações de audiência e de origem das visitas. Serviços integrados, como o Google Analytics, também podem utilizar seus próprios identificadores.</p><p>Você pode consultar, bloquear ou remover cookies nas configurações do navegador. A restrição pode afetar alguns recursos. Excluir cookies não remove, por si só, informações anteriormente recebidas pela Marquesano ou pelas plataformas integradas.</p></section>

          <section id="google"><h2>Google Analytics e Search Console</h2><p>Utilizamos o Google Analytics para medir tráfego, páginas acessadas, dispositivos, localização aproximada, origem das visitas e métricas de uso. Esses relatórios ajudam a entender o desempenho do site e a melhorar nossos serviços. A localização aproximada não equivale à localização precisa do dispositivo.</p><p>O Google Search Console é utilizado para acompanhar a presença do site na pesquisa do Google, incluindo consultas de pesquisa, páginas, cliques, impressões e indicadores de desempenho e indexação disponibilizados pela plataforma.</p><p>O tratamento realizado pelo Google também está sujeito à <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Política de Privacidade do Google</a>.</p></section>

          <section id="meta"><h2>Meta, Facebook e Instagram</h2><p>Quando você autoriza uma integração oficial com a Meta, o sistema pode acessar somente os dados disponibilizados pelas permissões concedidas e pelas contas às quais você tem acesso. Isso pode incluir:</p><ul>
            <li>Identificação da conta autorizada e contas de anúncios acessíveis.</li>
            <li>Informações de campanhas, status, orçamentos e negócios associados, quando disponíveis e autorizados.</li>
            <li>Métricas de anúncios, como impressões, alcance, cliques, gastos, custo por clique (CPC), custo por mil impressões (CPM) e taxa de cliques (CTR).</li>
          </ul><p>A integração de anúncios é destinada à leitura e ao acompanhamento de resultados. A autorização dessa integração não concede acesso a mensagens privadas, senhas ou informações fora das permissões autorizadas. A autenticação é realizada na própria Meta; não solicitamos sua senha do Facebook ou Instagram.</p><p>Credenciais de integração, como tokens de acesso, são tratadas no servidor para permitir as consultas autorizadas. Você pode revogar a autorização conforme explicado abaixo. O tratamento realizado pela Meta também segue sua <a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener noreferrer">Política de Privacidade</a>.</p></section>

          <section id="compartilhamento"><h2>Compartilhamento e prestadores de serviço</h2><p>As informações podem ser processadas por provedores necessários à operação dos serviços, como hospedagem, infraestrutura, e-mail, analytics e plataformas integradas. O compartilhamento deve se limitar ao necessário para as finalidades descritas nesta política e para a prestação do serviço.</p><p>Esses provedores podem operar em outros países, conforme sua infraestrutura e suas políticas. Informações também podem ser fornecidas quando necessário para cumprir uma obrigação legal, uma ordem válida ou proteger direitos e a segurança dos serviços.</p></section>

          <section id="seguranca"><h2>Segurança e retenção</h2><p>Adotamos medidas técnicas e organizacionais razoáveis para proteger dados e credenciais contra acesso, uso, alteração ou divulgação indevidos. Isso inclui restrição de acesso administrativo e proteção de credenciais de integração no servidor. Nenhum sistema oferece garantia absoluta de segurança.</p><p>Mantemos os dados apenas pelo período necessário à prestação dos serviços, à segurança, ao cumprimento de obrigações legais ou à finalidade informada. Encerrada a necessidade de tratamento, os dados devem ser excluídos ou anonimizados, ressalvadas as hipóteses em que a conservação seja necessária ou exigida por lei.</p></section>

          <section id="direitos"><h2>Seus direitos</h2><p>Você pode solicitar informações sobre o tratamento dos seus dados, acesso, correção ou exclusão, além de esclarecer dúvidas sobre integrações e permissões. Analisaremos as solicitações conforme as circunstâncias e a legislação aplicável.</p><p>Para proteger suas informações, podemos solicitar dados mínimos para confirmar sua identidade e sua relação com a conta indicada. Não solicitaremos senhas ou tokens de acesso por e-mail.</p></section>

          <section id="exclusao-de-dados" className={styles.deletion}><span className="eyebrow">SOLICITAÇÕES DE PRIVACIDADE</span><h2>Exclusão de dados</h2><p>Para solicitar a exclusão de dados mantidos pela Marquesano, envie um e-mail para <a href="mailto:suporte@marquesano.com.br">suporte@marquesano.com.br</a>, preferencialmente com o assunto <strong>“Exclusão de dados”</strong>.</p><p>Indique <strong>qual conta, serviço ou integração deseja remover</strong>. Quando a solicitação envolver a Meta, informe a identificação da conta autorizada ou da conta de anúncios, se disponível, e um contato para retorno. Não envie sua senha nem tokens.</p><p>Após a verificação necessária, trataremos a solicitação e informaremos o resultado ou eventuais dados que precisem ser mantidos por obrigação legal ou outra justificativa aplicável. Pedidos de exclusão de dados mantidos diretamente por outras plataformas devem também ser encaminhados a essas plataformas.</p></section>

          <section id="revogacao-meta"><h2>Revogação da autorização da Meta</h2><p>Você pode remover a autorização do aplicativo nas configurações da própria conta Meta/Facebook, na área de aplicativos ou integrações comerciais. A revogação impede novas consultas que dependam daquela autorização.</p><p>Também é possível desconectar a integração no painel da Marquesano, quando disponível. Essa ação remove a conexão e o token mantidos pelo painel, mas não substitui a revogação nas configurações da Meta nem o pedido de exclusão de outros dados eventualmente mantidos pela Marquesano. Para essa exclusão, siga as instruções da seção <a href="#exclusao-de-dados">Exclusão de dados</a>.</p></section>

          <section id="menores"><h2>Crianças e adolescentes</h2><p>Nossos serviços não são destinados a menores de 18 anos. Se você identificar o envio de dados de uma criança ou adolescente, entre em contato para que possamos avaliar a situação e tomar as medidas cabíveis.</p></section>

          <section id="alteracoes"><h2>Alterações desta política</h2><p>Esta política pode ser atualizada para refletir mudanças no site, nos serviços, nas integrações ou nas exigências aplicáveis. A versão atual ficará disponível nesta página, com a indicação da data de última atualização.</p></section>

          <section id="contato"><h2>Contato</h2><p>Para dúvidas ou solicitações sobre privacidade e dados pessoais:</p><address className={styles.contact}><strong>Marquesano</strong><a href="https://marquesano.com.br">https://marquesano.com.br</a><a href="mailto:suporte@marquesano.com.br">suporte@marquesano.com.br</a></address></section>
        </article>
      </div>
    </main>
    <MainFooter/>
  </div>;
}
