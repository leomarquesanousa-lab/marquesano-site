'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import styles from './admin.module.css';
import { Icon } from './visuals.js';

export function LoginForm({ available }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    if (pending) return;
    setPending(true); setError('');
    const fields = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: fields.get('email'), password: fields.get('password') }), signal: AbortSignal.timeout(15000) });
      if (response.ok) { window.location.assign('/admin/dashboard'); return; }
      const result = await response.json();
      setError(result.error || 'Não foi possível entrar.');
    } catch { setError('Não foi possível conectar. Tente novamente.'); }
    setPending(false);
  }
  return <form onSubmit={submit} className={styles.form}>
    {!available && <p role="status">Acesso administrativo ainda não configurado.</p>}
    <label>E-mail<input type="email" name="email" required maxLength={254} autoComplete="username" disabled={pending || !available}/></label>
    <label>Senha<input type="password" name="password" required maxLength={256} autoComplete="current-password" disabled={pending || !available}/></label>
    <button disabled={pending || !available}>{pending ? 'Entrando…' : 'Entrar'}</button>
    <p role="alert" className={styles.error}>{error}</p>
  </form>;
}

export function AdminShell({ user, links, children }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const pathname = usePathname();
  async function logout() {
    setPending(true); setError('');
    try {
      const response = await fetch('/api/admin/logout', { method: 'POST', signal: AbortSignal.timeout(15000) });
      if (response.ok || response.status === 401) { window.location.assign('/admin/login'); return; }
      setError('Não foi possível sair. Tente novamente.');
    } catch { setError('Falha de conexão ao sair.'); }
    setPending(false);
  }
  return <div className={styles.shell} onKeyDown={event => { if (event.key === 'Escape') setOpen(false); }}>
    <a className={styles.skip} href="#admin-main">Pular para o conteúdo</a>
    <aside className={`${styles.sidebar} ${open ? styles.open : ''}`} id="admin-navigation">
      <span className={styles.brand}>Marquesano <b>Admin</b></span>
      <nav aria-label="Menu administrativo">{links.map(link => <a key={link.href} href={link.href} aria-current={pathname === link.href ? 'page' : undefined} onClick={() => setOpen(false)}><Icon name={({dashboard:'chart',analytics:'pulse',marketing:'ads',seo:'globe',configuracoes:'settings',usuarios:'users',auditoria:'audit'})[link.href.split('/').pop()]}/>{link.title}</a>)}</nav>
      <small>Ambiente privado</small>
    </aside>
    <div className={styles.workspace}>
      <header className={styles.header}><button className={styles.menu} aria-controls="admin-navigation" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'Fechar menu' : 'Menu'}</button><div className={styles.account}><strong>{user.email}</strong><span>{user.role}</span></div><button onClick={logout} disabled={pending}>{pending ? 'Saindo…' : 'Sair'}</button></header>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <main className={styles.content} id="admin-main">{children}</main>
    </div>
  </div>;
}
