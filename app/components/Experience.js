"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import BookingCalendar from "./BookingCalendar";
import { availability } from "./availability.mjs";
import MainFooter from "./MainFooter";

export function Arrow() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 12h15M13 5l7 7-7 7"/></svg>; }

export function Navigation({ brand = "Marquesano", home = "/", links, action = "/contato", actionLabel = "Vamos conversar", commercial = false }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const items = links || [["Home", "/"], ["Serviços", "/servicos"], ["Portfólio", "/portfolio"], ["Planos", "/planos"], ["Sobre", "/sobre"], ["Contato", "/contato"]];
  return <header className={`studioNav ${commercial ? "commercialNav" : ""}`}>
    <a className={`studioBrand${commercial ? " siteLogo" : ""}`} href={commercial ? "/" : home}>{commercial ? <img src="/images/logobranco.png" width="2172" height="724" alt="Marquesano — Home"/> : <>{brand}<span className="brandDot">.</span></>}</a>
    <button className="mobileToggle" aria-label={open ? "Fechar menu" : "Abrir menu"} aria-expanded={open} aria-controls="site-navigation" onClick={() => setOpen(!open)}>{open ? "Fechar −" : "Menu +"}</button>
    <nav id="site-navigation" aria-label="Navegação principal" className={open ? "isOpen" : ""}>{items.map(([label, href]) => <a key={href} href={href} aria-current={pathname === href ? "page" : undefined} onClick={() => setOpen(false)}>{label}</a>)}{commercial && <a className="mobileContactAction" href={action} onClick={() => setOpen(false)}>{actionLabel}<Arrow/></a>}</nav>
    <a className="refinedBtn navAction" href={action}>{actionLabel}<Arrow/></a>
  </header>;
}

export function DemoBar({ name }) { return <div className="demoBar"><a href="/portfolio">← Voltar ao portfólio</a><span>{name} · Negócio fictício / demonstração</span></div>; }

export function Photo({ id, alt, className = "", eager = false, sizes = "(max-width: 760px) 100vw, 50vw" }) {
  const source = `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb`;
  return <img className={className} src={`${source}&w=1400&q=85`} srcSet={`${source}&w=480&q=80 480w, ${source}&w=900&q=85 900w, ${source}&w=1600&q=85 1600w`} sizes={sizes} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async"/>;
}

export function Form({ mode = "contact", options = [], professionals = [], closedDays = [], saturdayClosing = 24, title = "Enviar mensagem", initialMessage = "" }) {
  const [result, setResult] = useState(null);
  const [choice, setChoice] = useState(options[0] || "");
  const [selection, setSelection] = useState({ date: "", time: "" });
  const [calendarError, setCalendarError] = useState("");
  useEffect(() => {
    const plan = new URLSearchParams(window.location.search).get("plano");
    if (plan && options.includes(plan)) setChoice(plan);
  }, []);
  const booking = mode === "booking" || mode === "reservation";
  function submit(e) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const message = e.currentTarget.elements.message;
    message.setCustomValidity(!booking && !String(data.get("message")).trim() ? "Escreva sua mensagem antes de continuar." : "");
    const phone = e.currentTarget.elements.phone;
    phone.setCustomValidity(String(data.get("phone")).replace(/\D/g, "").length < 10 ? "Informe um telefone válido com DDD." : "");
    if (!e.currentTarget.reportValidity()) return;
    const date = selection.date;
    if (booking) {
      const valid = date && availability(date, { mode, closedDays, saturdayClosing }).slots.some(slot => slot.time === selection.time && slot.status === "available");
      if (!valid) {
        setCalendarError("Escolha um dia e um horário disponíveis na agenda.");
        e.currentTarget.querySelector(".bookingCalendar")?.focus();
        return;
      }
    }
    setResult({ name: data.get("name"), date: date ? String(date).split("-").reverse().join("/") : "", time: selection.time, choice: data.get("choice"), professional: data.get("professional") });
  }
  return <form className={`refinedForm${booking ? " bookingForm" : " contactForm"}`} onSubmit={submit} onChange={e => { setResult(null); e.currentTarget.elements.message?.setCustomValidity(""); e.currentTarget.elements.phone?.setCustomValidity(""); }}>
    {booking && <BookingCalendar value={selection} onChange={value => { setSelection(value); setResult(null); setCalendarError(""); }} mode={mode} closedDays={closedDays} saturdayClosing={saturdayClosing} error={calendarError}/>}
    <div className="formHeading"><span className="eyebrow">{booking ? "02 / SEUS DADOS" : "VAMOS CONVERSAR"}</span><p>{booking ? "Complete os dados para revisar sua seleção." : "Conte sua ideia. Vamos começar por aqui."}</p></div>
    <div className="formPair"><label>Seu nome<input name="name" autoComplete="name" required minLength={2} pattern=".*\S.*" placeholder="Como podemos chamar você?"/></label><label>E-mail<input type="email" name="email" autoComplete="email" required placeholder="voce@exemplo.com"/></label></div>
    <label>WhatsApp<input name="phone" type="tel" autoComplete="tel" pattern="[+0-9\s\(\)\-]{10,20}" title="Informe o telefone com DDD, de 10 a 20 caracteres." required placeholder="(11) 99999-9999"/></label>
    {options.length > 0 && <label>{mode === "reservation" ? "Número de pessoas" : booking ? "Serviço" : "Tenho interesse em"}<select name="choice" value={choice} onChange={e => setChoice(e.target.value)}>{options.map(o => <option key={o}>{o}</option>)}</select></label>}
    {mode === "booking" && professionals.length > 0 && <label>Profissional<select name="professional"><option>Sem preferência</option>{professionals.map(p => <option key={p}>{p}</option>)}</select></label>}
    <label>{booking ? "Observações (opcional)" : "Conte um pouco sobre o que você precisa"}<textarea name="message" rows={4} required={!booking} defaultValue={initialMessage} placeholder={booking ? "Alguma preferência para o atendimento?" : "Gostaria de saber mais sobre…"}/></label>
    <p className="formNote">Demonstração interativa. Os dados não são enviados nem armazenados.</p>
    <button className="refinedBtn" type="submit">{title}<Arrow/></button>
    <div role="status" aria-live="polite">{result && <div className="formSuccess"><strong>{result.name}, {booking ? "sua seleção está pronta." : "sua mensagem foi validada."}</strong><p>{booking ? `${result.choice}${result.professional ? ` · ${result.professional}` : ""} · ${result.date}, às ${result.time}. Nenhum horário foi reservado: esta é uma simulação.` : "Fluxo concluído em modo demonstrativo. Nenhuma mensagem foi enviada."}</p></div>}</div>
  </form>;
}

export function Location({ name, hours, address = "Rua das Oliveiras, 128 · São Paulo, SP" }) { return <section className="locationSection" id="localizacao"><div><span className="eyebrow">ENCONTRE SEU CAMINHO</span><h2>Esperamos você.</h2><p>{address}</p><p>{hours}</p><small>Endereço ilustrativo deste projeto.</small></div><div className="demoMap" role="img" aria-label={`Mapa ilustrativo da localização de ${name}`}><div className="mapPark">PRAÇA</div><div className="mapStreet">RUA DAS OLIVEIRAS</div><div className="mapPin"><span>●</span>{name}</div><small>MAPA DEMONSTRATIVO · SEM LOCALIZAÇÃO REAL</small></div></section>; }

export function Testimonials({ quotes }) { return <section className="editorialReviews"><span className="eyebrow">BOAS EXPERIÊNCIAS, BOAS HISTÓRIAS</span><div>{quotes.map(([quote, name]) => <blockquote key={name}><span aria-label="5 de 5 estrelas">★★★★★</span><p>“{quote}”</p><cite>{name}</cite></blockquote>)}</div><small>Depoimentos fictícios para apresentação do projeto.</small></section>; }

export function Footer({ brand = "Marquesano", demo = false }) { return demo ? <footer className="studioFooter"><a className="studioBrand" href="/portfolio">{brand}.</a><p>Um projeto demonstrativo por Marquesano.</p><a href="/portfolio">Conhecer outros projetos ↗</a></footer> : <MainFooter/>; }
