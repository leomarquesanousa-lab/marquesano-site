"use client";
import { getWhatsAppUrl } from "../config/whatsapp";
import { useState } from "react";
import { Navigation, DemoBar, Photo, Form, Location, Testimonials, Footer, Arrow } from "./Experience";

const products = [
  { name: "Caderno Essencial", category: "Papelaria", price: 39, image: "1925536", description: "Páginas para organizar ideias, planos e pequenos começos." },
  { name: "Vela Bosque", category: "Casa", price: 54, image: "278664", description: "Luz suave para deixar os momentos em casa mais acolhedores." },
  { name: "Ecobag Natural", category: "Acessórios", price: 48, image: "4068314", description: "Leve e versátil, para acompanhar as descobertas do dia." },
  { name: "Caneca Cerâmica", category: "Casa", price: 46, image: "1566308", description: "Uma pausa para o café, com textura e personalidade." },
  { name: "Planner Semanal", category: "Papelaria", price: 58, image: "733857", description: "Uma semana de cada vez. Espaço para o que importa." },
  { name: "Kit Presente", category: "Presentes", price: 89, image: "264985", description: "Uma seleção delicada para transformar carinho em presente." }
];

export default function Commerce() {
  const [category, setCategory] = useState("Todos");
  const [selected, setSelected] = useState(null);
  const shown = category === "Todos" ? products : products.filter(p => p.category === category);
  return <main className="bosquePage"><DemoBar name="Bosque Store"/><Navigation brand="bosque" home="/exemplos/comercio" links={[["Coleção", "#produtos"], ["Nossa loja", "#loja"], ["Visite", "#localizacao"], ["Contato", "#contato"]]} action="#produtos" actionLabel="Explorar coleção"/>
    <section className="bosqueHero"><div><span className="eyebrow">OBJETOS SIMPLES. ESCOLHAS COM SIGNIFICADO.</span><h1>Mais cuidado<br/>no <em>cotidiano.</em></h1><p>Para a casa, para presentear, para você. Uma curadoria de pequenos objetos que fazem a vida mais bonita.</p><a href="#produtos" className="refinedBtn">Encontre seu favorito<Arrow/></a></div><Photo id="3738387" alt="Objetos selecionados para o dia a dia" eager/><span className="bosqueEdition">COLEÇÃO ESSENCIAL / 01</span></section>
    <div className="bosqueBenefits"><span>Curadoria com propósito</span><span>Retirada na loja</span><span>Embalagem para presente</span><span>Atendimento próximo</span></div>
    <section className="bosqueCollection" id="produtos"><div className="sectionHeading"><div><span className="eyebrow">ENCONTRE ALGO SEU</span><h2>Os nossos essenciais.</h2></div><p>Escolhidos pelo design.<br/>Amados pela utilidade.</p></div><div className="productFilters" aria-label="Filtrar produtos">{["Todos", "Casa", "Papelaria", "Acessórios", "Presentes"].map(c => <button key={c} aria-pressed={c === category} className={c === category ? "active" : ""} onClick={() => setCategory(c)}>{c}</button>)}</div><p className="productCount" role="status">{shown.length} produtos · {category}</p><div className="bosqueProducts">{shown.map(p => <article key={p.name}><div className="bosqueProductPhoto"><Photo id={p.image} alt={`Imagem ilustrativa: ${p.name}`}/><span>{p.category}</span></div><div className="bosqueProductTitle"><h3>{p.name}</h3><strong>R$ {p.price}</strong></div><p>{p.description}</p><button className="textButton" onClick={() => { setSelected(p); document.getElementById("consulta-produto")?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>Consultar produto<Arrow/></button></article>)}</div><div id="consulta-produto" className="productInquiry" aria-live="polite">{selected && <><div><span className="eyebrow">SUA ESCOLHA</span><h3>{selected.name} · R$ {selected.price}</h3><p>{selected.description}</p><a className="refinedBtn" href="#contato">Perguntar sobre disponibilidade<Arrow/></a></div><button aria-label="Limpar produto selecionado" className="textButton" onClick={() => setSelected(null)}>Fechar ×</button></>}</div><small>Produtos, preços e disponibilidade demonstrativos. Fotografias ilustrativas.</small></section>
    <section className="bosqueStory" id="loja"><Photo id="6208086" alt="Objetos de decoração e detalhes acolhedores para a casa"/><div><span className="eyebrow">UMA LOJA DE BAIRRO. UM OLHAR CUIDADOSO.</span><h2>O essencial<br/>tem seu encanto.</h2><p>A Bosque nasceu para reunir objetos que combinam beleza e função. Escolhemos cada peça pensando em como ela vai fazer parte da sua rotina.</p><p>Venha olhar de perto, sentir as texturas e encontrar um presente com a cara de quem você gosta.</p><a className="textButton" href="#localizacao">Planeje sua visita<Arrow/></a></div></section>
    <Testimonials quotes={[["Encontrei um presente delicado e fui muito bem atendida.", "Ana P."], ["Uma seleção bonita, com coisas úteis de verdade.", "Luiza C."], ["A embalagem já fez parte do presente. Muito cuidado!", "Marcos R."]]}/>
    <Location name="Bosque Store" hours="Segunda a sexta · 9h às 18h / Sábado · 9h às 14h"/>
    <section className="experienceContact" id="contato"><div><span className="eyebrow">PODE CHEGAR MAIS PERTO</span><h2>Como podemos ajudar?</h2><p>Consulte um produto, escolha um presente ou tire uma dúvida sobre a retirada.</p><a className="refinedBtn" href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer">Falar pelo WhatsApp<Arrow/></a></div><Form key={selected?.name || "general"} initialMessage={selected ? `Olá! Gostaria de consultar a disponibilidade de ${selected.name}.` : ""} title="Preparar consulta"/></section><Footer brand="bosque" demo/>
  </main>;
}
