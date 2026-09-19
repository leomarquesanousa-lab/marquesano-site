import { pageMetadata } from "../../config/metadata";


import { Navigation, Form, Location } from "../../components/Experience";

export const metadata = pageMetadata("/exemplos/clinica", "Clínica Aurora | Portfólio Marquesano", "Clínica Aurora: exemplo demonstrativo de site para saúde no portfólio da Marquesano.");
export default function Clinica() {
  return (
    <main className="clinic">
      <div className="demoNotice">
        <a href="/">← Voltar para Marquesano</a>
        <span>CLÍNICA FICTÍCIA • DEMONSTRAÇÃO</span>
      </div>

      <Navigation brand="aurora" home="/exemplos/clinica" links={[["Especialidades", "#especialidades"], ["A clínica", "#clinica"], ["Agenda", "#agenda"], ["Contato", "#contato"]]} action="#agenda" actionLabel="Agendar consulta"/>

      <section id="inicio" className="clinicHero">
        <div className="clinicHeroCopy">
          <span className="clinicKicker">SAÚDE COM ATENÇÃO EM CADA DETALHE</span>
          <h1>Cuidado que começa antes da consulta.</h1>
          <p>Uma clínica moderna, acolhedora e preparada para acompanhar você em cada fase da sua saúde.</p>

          <div className="clinicActions">
            <a className="clinicBtn large" href="#agenda">Agendar uma consulta</a>
            <a className="clinicTextLink" href="#especialidades">Conheça nossas especialidades →</a>
          </div>

          <div className="clinicTrust">
            <div><strong>6</strong><span>especialidades</span></div>
            <div><strong>4,9</strong><span>avaliação dos pacientes</span></div>
            <div><strong>Seg–Sex</strong><span>atendimento</span></div>
          </div>
        </div>

        <div className="clinicHeroImage">
          <img
            src="https://images.pexels.com/photos/7089401/pexels-photo-7089401.jpeg?auto=compress&cs=tinysrgb&w=1400&q=85"
            alt="Consulta humanizada"
          />
          <div className="clinicImageCard">
            <span>CUIDADO NO SEU TEMPO</span>
            <strong>Escolha seu horário</strong>
            <small>Agendamento demonstrativo</small>
          </div>
        </div>
      </section>

      <section className="clinicMiniStrip">
        <span>Atendimento humanizado</span><i>•</i>
        <span>Estrutura moderna</span><i>•</i>
        <span>Equipe multidisciplinar</span><i>•</i>
        <span>Agendamento fácil</span>
      </section>

      <section id="especialidades" className="clinicSection">
        <div className="clinicIntro">
          <span className="clinicKicker">ESPECIALIDADES</span>
          <h2>Saúde completa em um só lugar.</h2>
          <p>Profissionais preparados para cuidar de você com uma visão integrada, atendimento próximo e acompanhamento contínuo.</p>
        </div>

        <div className="specialtyGrid">
          {[
            ["Clínica Geral","Cuidado preventivo, acompanhamento e orientação para sua saúde no dia a dia.","01"],
            ["Cardiologia","Avaliação, prevenção e acompanhamento da saúde cardiovascular.","02"],
            ["Dermatologia","Cuidado clínico e estético para pele, cabelos e unhas.","03"],
            ["Nutrição","Planos personalizados para saúde, bem-estar e qualidade de vida.","04"],
            ["Ginecologia","Acompanhamento completo da saúde da mulher em todas as fases.","05"],
            ["Ortopedia","Diagnóstico e cuidado para mobilidade, dores e qualidade de movimento.","06"]
          ].map(([t,p,n]) => (
            <article className="specialtyCard" key={t}>
              <span>{n}</span>
              <h3>{t}</h3>
              <p>{p}</p>
              <a href="#agenda">Agendar ↗</a>
            </article>
          ))}
        </div>
      </section>

      <section id="clinica" className="clinicStory">
        <div className="storyImage">
          <img
            src="https://images.pexels.com/photos/4266936/pexels-photo-4266936.jpeg?auto=compress&cs=tinysrgb&w=1200&q=85"
            alt="Profissional de saúde escutando uma paciente em consulta"
            loading="lazy"
          />
          <div className="storyStat"><strong>8 anos</strong><span>cuidando de pessoas</span></div>
        </div>

        <div className="storyCopy">
          <span className="clinicKicker">A CLÍNICA</span>
          <h2>Tecnologia sem perder o lado humano.</h2>
          <p>A Aurora nasceu para oferecer uma experiência diferente em saúde: menos burocracia, mais atenção e um ambiente onde cada pessoa se sente realmente cuidada.</p>
          <p>Nossa estrutura combina tecnologia, conforto e uma equipe que acredita que escutar também faz parte do tratamento.</p>
          <div className="storyChecks">
            <span>✓ Consultórios modernos</span>
            <span>✓ Prontuário digital</span>
            <span>✓ Atendimento integrado</span>
            <span>✓ Fácil acesso e estacionamento</span>
          </div>
        </div>
      </section>

      <section id="agenda" className="experienceContact"><div><span className="eyebrow">CUIDADO COM TEMPO PARA VOCÊ</span><h2>Sua consulta começa<br/>com uma boa escolha.</h2><p>Encontre um dia livre na agenda e escolha seu horário. Atendemos de segunda a sexta, com tempo para ouvir e cuidar.</p></div><Form mode="booking" closedDays={[0, 6]} options={["Clínica Geral", "Cardiologia", "Dermatologia", "Nutrição", "Ginecologia", "Ortopedia"]} title="Simular agendamento"/></section>

      <section className="reviewsSection">
        <div className="clinicIntro center">
          <span className="clinicKicker">EXPERIÊNCIAS ILUSTRATIVAS</span>
          <h2>Confiança construída no atendimento.</h2>
        </div>
        <div className="reviewGrid">
          <article><div className="stars">★★★★★</div><p>“Desde o agendamento até a consulta, tudo foi simples e muito atencioso.”</p><strong>Fernanda M.</strong></article>
          <article><div className="stars">★★★★★</div><p>“Ambiente impecável e profissionais que realmente escutam o paciente.”</p><strong>Ricardo S.</strong></article>
          <article><div className="stars">★★★★★</div><p>“Foi a primeira vez que saí de uma consulta sentindo que tive tempo para tirar todas as dúvidas.”</p><strong>Camila R.</strong></article>
        </div>
      </section>

      <Location name="Clínica Aurora" hours="Segunda a sexta · 7h às 20h"/>
      <section id="contato" className="experienceContact"><div><span className="eyebrow">ESTAMOS POR PERTO</span><h2>Podemos ajudar?</h2><p>Converse com a equipe sobre horários, especialidades e atendimento.</p></div><Form title="Preparar mensagem"/></section>

      <footer className="clinicFooter">
        <div className="clinicLogo">
          <span className="clinicSymbol">a</span>
          <div><strong>aurora</strong><small>clínica integrada</small></div>
        </div>
        <p>Segunda a sexta, 7h às 20h</p>
        <p>Clínica, avaliações e depoimentos fictícios. Projeto Marquesano.</p>
      </footer>
    </main>
  );
}
