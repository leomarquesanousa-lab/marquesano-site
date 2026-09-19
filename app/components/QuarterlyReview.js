import { Arrow } from "./Experience";

export default function QuarterlyReview() {
  return <section className="quarterlyReview" aria-label="Revisão trimestral com consultoria agendada">
    <div className="quarterlyReviewCopy">
      <span className="eyebrow">BENEFÍCIO PREMIUM / ACOMPANHAMENTO CONTÍNUO</span>
      <h2>Seu site não fica parado.</h2>
      <p className="quarterlyReviewLead">A cada 3 meses, revisamos seu site junto com você.</p>
      <p>Nos planos que incluem o benefício, você conta com uma revisão trimestral do site com consultoria agendada. Um momento para avaliar o que pode melhorar e definir os próximos ajustes para acompanhar seu negócio.</p>
      <a className="refinedBtn" href="/contato">Consultar inclusão no meu plano<Arrow/></a>
    </div>
    <div className="quarterlyReviewDetails">
      <span className="quarterlyReviewBadge">A CADA 3 MESES <span>Encontro agendado</span></span>
      <h3>Tecnologia moderna + acompanhamento contínuo.</h3>
      <p>Sites rápidos, responsivos e desenvolvidos com tecnologias modernas para uma boa experiência em qualquer dispositivo.</p>
      <p>A revisão pode contemplar:</p>
      <ul>
        <li>Análise visual e da experiência em celular.</li>
        <li>Atualização de informações e revisão de textos e chamadas.</li>
        <li>Revisão de botões e formulários e conferência de links.</li>
        <li>Sugestões de melhoria e oportunidades para gerar mais contatos.</li>
        <li>Pequenas recomendações de SEO e presença digital.</li>
      </ul>
      <p className="quarterlyReviewNote">Uma revisão a cada 3 meses, mediante agendamento, incluída no plano quando aplicável. Escopo e ajustes conforme o plano contratado. Não inclui consultoria ilimitada.</p>
    </div>
  </section>;
}
