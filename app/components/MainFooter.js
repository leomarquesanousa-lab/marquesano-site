import { getWhatsAppUrl } from "../config/whatsapp";

export default function MainFooter() {
  return <footer className="marquesanoFooter">
    <div className="marquesanoFooterGrid">
      <div className="marquesanoFooterBrand"><a href="/" aria-label="Marquesano — Home"><img src="/images/logobranco.png" width="2172" height="724" alt="Marquesano"/></a><p>Sites que apresentam seu negócio com cuidado. Tecnologia moderna e acompanhamento contínuo.</p></div>
      <nav aria-label="Navegação do rodapé"><h2>Explore</h2><div>{[["Home", "/"], ["Serviços", "/servicos"], ["Portfólio", "/portfolio"], ["Planos", "/planos"], ["Sobre", "/sobre"], ["Contato", "/contato"], ["Política de Privacidade", "/politica-de-privacidade"], ["Termos de Serviço", "/termos-de-servico"], ["Exclusão de Dados", "/exclusao-de-dados"]].map(([label, href]) => <a key={href} href={href}>{label}</a>)}</div></nav>
      <div className="marquesanoFooterContact"><h2>Vamos conversar</h2><a href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer">WhatsApp ↗<span>+55 11 94070-2998</span></a><a href="https://marquesano.com.br">marquesano.com.br</a></div>
    </div>
    <div className="marquesanoFooterBottom"><p>© 2026 Marquesano. Todos os direitos reservados.</p><a href="/contato">Comece seu projeto ↗</a></div>
  </footer>;
}
