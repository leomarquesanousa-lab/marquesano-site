'use client';
import { useEffect, useState } from 'react';
import styles from './admin.module.css';

const subscriptionStatus={authorized:'Ativa',pending:'Pendente',paused:'Pausada',cancelled:'Cancelada'};
const paymentStatus={approved:'Pagamento aprovado',pending:'Pagamento pendente',in_process:'Pagamento pendente',authorized:'Pagamento autorizado (aguardando captura)',rejected:'Pagamento recusado',cancelled:'Pagamento cancelado',refunded:'Pagamento reembolsado',charged_back:'Pagamento contestado'};
const date=value=>value?new Date(value).toLocaleString('pt-BR'):'—';

export default function BillingHistory({api}) {
  const [data,setData]=useState(null),[error,setError]=useState(''),[page,setPage]=useState(1),[refresh,setRefresh]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();let timer;
    async function update() {
      try {const result=await api('configuracoes/pagamentos/historico?page='+page,{signal:controller.signal});if(!controller.signal.aborted){setData(result);setError('');}}
      catch(e){if(!controller.signal.aborted)setError(e.message);}
      finally {if(!controller.signal.aborted)timer=setTimeout(()=>{if(document.visibilityState==='visible')update();else timer=setTimeout(update,15000);},15000);}
    }
    update();return()=>{controller.abort();clearTimeout(timer);};
  },[api,page,refresh]);
  return <section className={styles.panel} aria-label="Assinaturas e pagamentos"><div className={styles.sectionHeading}><h3>Assinaturas e pagamentos</h3><button type="button" onClick={()=>setRefresh(n=>n+1)}>Atualizar histórico</button></div>
    {error&&<p className={styles.error} role="alert">{error}</p>}
    {!data&&!error&&<p>Carregando histórico…</p>}
    {data&&<>
      <p>Webhook: <strong>{data.webhook.configured?'Configurado no servidor':'Não configurado'}</strong></p>
      <p>URL: <code>{data.webhook.url||'Configure ADMIN_SITE_ORIGIN com HTTPS.'}</code></p>
      <p>Webhook Secret: {data.webhook.secret_configured?'Configurado':'Não configurado'}</p>
      <p className={styles.help}>Cadastre a URL e os eventos no Mercado Pago. Última notificação processada: {date(data.last_received)}. O histórico é atualizado automaticamente a cada 15 segundos.</p>
      <h3>Assinaturas</h3>
      {data.subscriptions.length?<div className={styles.tableWrap}><table><thead><tr><th>Plano / assinatura</th><th>Contato</th><th>Status</th><th>Próxima cobrança</th></tr></thead><tbody>{data.subscriptions.map(s=><tr key={s.id}><td>{s.plan_name}<small className={styles.recordId} title={s.id}>{s.id}</small></td><td>{s.payer_email||'Não informado'}</td><td>{subscriptionStatus[s.status]||s.status}</td><td>{date(s.next_payment_date)}</td></tr>)}</tbody></table></div>:<p>Nenhuma assinatura nesta página.</p>}
      <h3>Histórico de pagamentos</h3>
      {data.payments.length?<div className={styles.tableWrap}><table><thead><tr><th>Pagamento / assinatura</th><th>Status</th><th>Valor</th><th>Aprovação</th><th>Atualização no provedor</th></tr></thead><tbody>{data.payments.map(p=><tr key={p.id}><td>{p.id}<small className={styles.recordId} title={p.subscription_id||''}>{p.subscription_id||'Vínculo com assinatura pendente'}</small></td><td>{paymentStatus[p.status]||p.status}</td><td>{new Intl.NumberFormat('pt-BR',{style:'currency',currency:p.currency}).format(p.amount_cents/100)}</td><td>{date(p.paid_at)}</td><td>{date(p.updated_at)}</td></tr>)}</tbody></table></div>:<p>Nenhum pagamento nesta página.</p>}
      <h3>Faturas recorrentes</h3>
      {data.invoices.length?<div className={styles.tableWrap}><table><thead><tr><th>Fatura</th><th>Assinatura</th><th>Status da fatura</th><th>Data prevista</th></tr></thead><tbody>{data.invoices.map(i=><tr key={i.id}><td>{i.id}</td><td>{i.subscription_id}</td><td>{({scheduled:'Agendada',processed:'Processada',recycling:'Nova tentativa de cobrança',cancelled:'Cancelada'})[i.status]||i.status}</td><td>{date(i.debit_date)}</td></tr>)}</tbody></table></div>:<p>Nenhuma fatura nesta página.</p>}
      <p className={styles.help}>Uma fatura processada não equivale a um pagamento aprovado. O status financeiro vem da API de pagamentos.</p>
      <div className={styles.actions}><button type="button" disabled={page===1} onClick={()=>setPage(p=>p-1)}>Anterior</button><span>Página {page}</span><button type="button" disabled={page*25>=Math.max(data.totals.subscriptions,data.totals.payments,data.totals.invoices)} onClick={()=>setPage(p=>p+1)}>Próxima</button></div>
    </>}
  </section>;
}
