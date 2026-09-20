"use client";

import { useEffect, useRef, useState } from "react";
import { Arrow } from "./Experience";
import { getWhatsAppUrl } from "../config/whatsapp";
import { createContactSession } from "./contact-session.mjs";

export default function ContactForm({ options = ["Quero conhecer os planos", "Projeto sob medida"] }) {
  const [choice, setChoice] = useState(options[0]);
  const [status, setStatus] = useState(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const session = useRef(null);
  if (!session.current) session.current = createContactSession();
  useEffect(() => {
    const plan = new URLSearchParams(window.location.search).get("plano");
    if (plan && options.includes(plan)) setChoice(plan);
    // Preparação silenciosa. Erros só aparecem depois de uma tentativa de envio.
    session.current.prepare().catch(() => {});
  }, []);
  async function submit(event) {
    event.preventDefault();
    if (busy.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    form.elements.name.setCustomValidity(String(data.get("name")).trim().length >= 2 ? "" : "Informe seu nome.");
    const phone = form.elements.phone;
    phone.setCustomValidity(/^\d{10,15}$/.test(String(data.get("phone")).replace(/\D/g, "")) ? "" : "Informe o telefone com DDD.");
    const message = form.elements.message;
    message.setCustomValidity(String(data.get("message")).trim().length >= 10 ? "" : "Escreva uma mensagem com pelo menos 10 caracteres.");
    if (!form.reportValidity()) return;
    busy.current = true;
    setPending(true);
    setStatus(null);
    try {
      const result = await session.current.send(Object.fromEntries(data));
      setStatus({ error: false, message: result.message });
      form.reset();
      session.current.prepare().catch(() => {});
    } catch (error) {
      setStatus({ error: true, message: error.name === "TimeoutError" || error instanceof TypeError ? "Falha de conexão. Tente novamente ou fale pelo WhatsApp." : error.message });
    } finally { busy.current = false; setPending(false); }
  }
  return <form className="refinedForm contactForm" onSubmit={submit} aria-busy={pending} onChange={e => { e.currentTarget.elements.name.setCustomValidity(""); e.currentTarget.elements.phone.setCustomValidity(""); e.currentTarget.elements.message.setCustomValidity(""); }}>
    <div className="formHeading"><span className="eyebrow">VAMOS CONVERSAR</span><p>Conte sua ideia. Vamos começar por aqui.</p></div>
    <div className="formPair"><label>Seu nome<input name="name" required minLength={2} maxLength={100} autoComplete="name" placeholder="Como podemos chamar você?" disabled={pending}/></label><label>E-mail<input type="email" name="email" required maxLength={254} autoComplete="email" placeholder="voce@exemplo.com" disabled={pending}/></label></div>
    <label>WhatsApp<input name="phone" type="tel" required minLength={10} maxLength={24} autoComplete="tel" placeholder="(11) 99999-9999" disabled={pending}/></label>
    <label>Tenho interesse em<select name="interest" value={choice} onChange={e => setChoice(e.target.value)} disabled={pending}>{options.map(option => <option key={option}>{option}</option>)}</select></label>
    <label>Conte um pouco sobre o que você precisa<textarea name="message" required minLength={10} maxLength={4000} rows={4} placeholder="Meu negócio é… e gostaria de…" disabled={pending}/></label>
    <div className="formTrap" aria-hidden="true"><label>Deixe este campo vazio<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
    <p className="formNote">Usaremos seus dados para responder a esta solicitação de contato.</p>
    <button className="refinedBtn" type="submit" disabled={pending}>{pending ? "Enviando…" : "Enviar mensagem"}<Arrow/></button>
    <div aria-live="polite" role="status">{status && <p className={status.error ? "formError" : "formSuccess"}>{status.message}</p>}</div>
    <a className="textButton" href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer">Prefere conversar pelo WhatsApp? ↗</a>
  </form>;
}
