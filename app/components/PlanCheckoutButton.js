'use client';

import { useRef, useState } from 'react';
import styles from './PlanCheckoutButton.module.css';

export default function PlanCheckoutButton({ code, name, revision, className, children }) {
  const pending = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function checkout() {
    if (pending.current) return;
    pending.current = true;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/checkout/${code}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revision }), signal: AbortSignal.timeout(20000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Plano temporariamente indisponível');
      window.location.assign(data.url);
    } catch (failure) {
      setError(failure.name === 'TypeError' || failure.name === 'TimeoutError'
        ? 'Não foi possível iniciar a assinatura. Verifique sua conexão e tente novamente.'
        : failure.message || 'Plano temporariamente indisponível');
      pending.current = false;
      setLoading(false);
    }
  }

  return <>
    <button type="button" className={`${className} ${styles.button}`} onClick={checkout} disabled={loading} aria-busy={loading}
      aria-describedby={error ? `checkout-error-${code}` : undefined}>
      {loading ? 'Iniciando…' : `Assinar ${name}`}{!loading && children}
    </button>
    {error && <div className={styles.error} id={`checkout-error-${code}`} role="alert">{error}</div>}
  </>;
}
