"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { getWhatsAppUrl } from "../config/whatsapp";
import styles from "./FloatingWhatsApp.module.css";

export default function FloatingWhatsApp() {
  const [notice, setNotice] = useState(false);
  const pathname = usePathname();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;
  const url = getWhatsAppUrl();
  const icon = <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true"><path d="M20.52 3.48A11.91 11.91 0 0 0 12.04 0C5.45 0 .09 5.36.09 11.95c0 2.11.55 4.17 1.6 5.99L0 24l6.24-1.64a11.95 11.95 0 0 0 5.8 1.48h.01c6.59 0 11.95-5.36 11.95-11.95a11.87 11.87 0 0 0-3.48-8.41ZM12.05 21.82a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.7.97.99-3.61-.24-.37a9.91 9.91 0 0 1-1.52-5.27c0-5.48 4.46-9.94 9.94-9.94a9.87 9.87 0 0 1 7.03 2.91 9.86 9.86 0 0 1 2.91 7.03c0 5.48-4.46 9.94-9.94 9.94Zm5.45-7.44c-.3-.15-1.77-.88-2.05-.98-.27-.1-.47-.15-.67.15-.2.3-.77.98-.94 1.18-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.8-1.49-1.78-1.67-2.08-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.59-.49-.51-.67-.52h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.21 5.09 4.5.71.31 1.27.49 1.7.63.71.22 1.36.19 1.87.11.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35Z"/></svg>;
  return <aside className={styles.floating} aria-label="Contato pelo WhatsApp" onKeyDown={e => { if (e.key === "Escape") setNotice(false); }}>
    {notice && <div className={styles.notice} id="whatsapp-notice" role="status"><strong>WhatsApp em breve</strong><p>Nosso canal de WhatsApp ainda não está configurado.</p><button type="button" onClick={() => setNotice(false)}>Fechar aviso</button></div>}
    {url ? <a className={styles.button} href={url} target="_blank" rel="noopener noreferrer" aria-label="Conversar pelo WhatsApp (abre em nova aba)">{icon}</a> : <button type="button" className={styles.button} aria-label="WhatsApp — informações de contato" aria-expanded={notice} aria-controls="whatsapp-notice" onClick={() => setNotice(!notice)}>{icon}</button>}
  </aside>;
}
