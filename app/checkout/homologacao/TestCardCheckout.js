'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';
import { priceLabel } from '../../config/plans.mjs';
import styles from '../Checkout.module.css';

export default function TestCardCheckout({ code, revision, amount, publicKey, buyerEmail, diagnostics = false }) {
  const form = useRef(null);
  const sdkForm = useRef(null);
  const busy = useRef(false);
  const requestId = useRef(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verify, setVerify] = useState(false);
  const [result, setResult] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const storageKey = `marquesano-checkout-${code}-${revision}`;

  useEffect(() => {
    if (diagnostics) console.info('CHECKOUT_LOCAL_CARDFORM', {
      plan_code_received: code,
      mercado_pago_public_key_available: Boolean(publicKey?.trim()),
      mercado_pago_sdk_loaded: sdkReady && typeof window.MercadoPago === 'function',
      cardform_initialized: ready,
    });
  }, [code, publicKey, sdkReady, ready, diagnostics]);

  async function send(token) {
    if (busy.current || submitted) return;
    if (!form.current.elements.terms.checked) { setError('Leia e aceite os Termos de Serviço para continuar.'); return; }
    busy.current = true; setSubmitted(true); setLoading(true); setError('');
    try {
      if (!requestId.current) {
        try { requestId.current = sessionStorage.getItem(storageKey); } catch { /* Memory fallback. */ }
        if (!/^[a-f0-9]{64}$/.test(requestId.current || '')) requestId.current = Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2, '0')).join('');
        try { sessionStorage.setItem(storageKey, requestId.current); } catch { /* Never store card data. */ }
      }
      const response = await fetch('/api/mp-homologacao', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(45000),
        body: JSON.stringify({ revision, request_id: requestId.current, payer_email: form.current.elements.email.value, terms: true, ...(token ? { card_token_id: token } : {}) }),
      });
      const data = await response.json();
      setResult(data);
      if (!response.ok) setError(data.error || 'Falha na homologação.');
    } catch {
      setVerify(true); setError('Não foi possível confirmar o resultado. Verifique a assinatura antes de repetir a contratação.');
    } finally { busy.current = false; setLoading(false); }
  }
  const sendRef = useRef(send);
  sendRef.current = send;

  useEffect(() => {
    if (!publicKey?.trim()) { setError('Pagamento seguro indisponível: chave pública não configurada.'); return; }
    if (!Number.isSafeInteger(amount) || amount <= 0) { setError('O preço deste plano precisa ser configurado antes da contratação.'); return; }
    if (!sdkReady || !window.MercadoPago) return;
    let mounted = true;
    const failed = () => { if (mounted) setError('Confira os dados do cartão e do titular. Se o erro persistir, tente novamente em instantes.'); };
    try {
      const mp = new window.MercadoPago(publicKey, { locale: 'pt-BR' });
      sdkForm.current = mp.cardForm({
        amount: (amount / 100).toFixed(2), iframe: true,
        form: { id: 'marquesano-card-form',
          cardNumber: { id: 'mp-card-number', placeholder: 'Número do cartão' },
          expirationDate: { id: 'mp-card-expiry', placeholder: 'MM/AA' },
          securityCode: { id: 'mp-card-cvv', placeholder: 'CVV' },
          cardholderName: { id: 'mp-card-name' }, cardholderEmail: { id: 'mp-card-email' },
          issuer: { id: 'mp-card-issuer' }, installments: { id: 'mp-card-installments' },
          identificationType: { id: 'mp-doc-type' }, identificationNumber: { id: 'mp-doc-number' },
        },
        callbacks: {
          onFormMounted: failure => { if (failure) failed(); },
          onReady: () => { if (mounted) setReady(true); },
          onError: failed,
          onSubmit: event => {
            event.preventDefault();
            const data = sdkForm.current?.getCardFormData();
            console.info('TEST_CARD_TOKEN_CREATED=' + Boolean(data?.token));
            if (!data?.token) return failed();
            void sendRef.current(data.token);
          },
        },
      });
    } catch { failed(); }
    return () => { mounted = false; sdkForm.current?.unmount(); sdkForm.current = null; };
  }, [sdkReady, publicKey, amount]);

  return <>
    {publicKey && <Script src="https://sdk.mercadopago.com/js/v2" strategy="afterInteractive" onReady={() => setSdkReady(true)} onError={() => setError('Não foi possível carregar o pagamento seguro. Recarregue a página.')} />}
    <form ref={form} id="marquesano-card-form" className={styles.form} onSubmit={event => event.preventDefault()}>
      <label htmlFor="mp-card-email">E-mail<input id="mp-card-email" name="email" type="email" autoComplete="email" maxLength={254} required defaultValue={buyerEmail} readOnly /></label>
      <label htmlFor="mp-card-name">Nome do titular<input id="mp-card-name" autoComplete="cc-name" required /></label>
      <div><p id="card-number-label">Número do cartão</p><div id="mp-card-number" className={styles.secureField} aria-labelledby="card-number-label" /></div>
      <div className={styles.pair}><div><p id="expiry-label">Validade</p><div id="mp-card-expiry" className={styles.secureField} aria-labelledby="expiry-label" /></div><div><p id="cvv-label">Código de segurança</p><div id="mp-card-cvv" className={styles.secureField} aria-labelledby="cvv-label" /></div></div>
      <div className={styles.pair}><label htmlFor="mp-doc-type">Documento<select id="mp-doc-type" /></label><label htmlFor="mp-doc-number">Número do documento<input id="mp-doc-number" inputMode="numeric" required /></label></div>
      <label htmlFor="mp-card-issuer">Banco emissor<select id="mp-card-issuer" /></label>
      <select id="mp-card-installments" hidden aria-label="Parcela da cobrança mensal" defaultValue="1"><option value="1">1</option></select>
      <label className={styles.consent}><input type="checkbox" name="terms" required /><span>Li e concordo com os <a href="/termos-de-servico" target="_blank" rel="noopener noreferrer">Termos de Serviço</a> e com a contratação de uma assinatura com duração de 12 meses e cobranças mensais recorrentes.</span></label>
      {result && <pre role="status" style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(result,null,2)}</pre>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {false ? <button className={styles.button} type="button" disabled={loading} onClick={() => void send()}>{loading ? 'Verificando…' : 'Verificar assinatura'}</button> : <button className={styles.button} type="submit" disabled={!ready || loading || submitted} aria-busy={loading}>{loading ? 'Confirmando assinatura…' : ready ? `Assinar por ${priceLabel(amount)} / mês` : 'Carregando pagamento seguro…'}</button>}
      <p className={styles.detail}>Processado por Mercado Pago. Os dados do cartão são enviados diretamente ao Mercado Pago para tokenização.</p>
    </form>
  </>;
}
