'use client';
import { useEffect, useState } from 'react';
import styles from './admin.module.css';
import { Table } from './report-sections.js';
import { Badge, MetricCard, LoadingState } from './visuals.js';

const labels={authorized:'Ativa',pending:'Pendente',rejected:'Recusada',cancelled:'Cancelada',paused:'Pausada',finished:'Finalizada',overdue:'Em atraso',approved:'Aprovado',refunded:'Estornado',charged_back:'Contestação',in_process:'Em processamento',welcome:'Confirmação da assinatura',SENT:'Enviado',PENDING:'Pendente',SENDING:'Enviando',UNKNOWN:'Sem confirmação',REVIEW:'Conferir no provedor'};
const money=(v,c='BRL')=>v==null?'Não informado':new Intl.NumberFormat('pt-BR',{style:'currency',currency:c||'BRL'}).format(v/100);
const date=v=>v?new Date(v).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):'Não informada';
const badge=s=><Badge tone={['approved','authorized','SENT'].includes(s)?'positive':['rejected','cancelled','overdue','REVIEW'].includes(s)?'negative':'neutral'}>{labels[s]||s||'Não informado'}</Badge>;
const metrics=[['active','Assinaturas ativas'],['new_month','Novas no mês'],['revenue_month','Receita recebida no mês',true],['mrr','Receita mensal prevista',true],['approved','Pagamentos aprovados'],['rejected','Pagamentos recusados'],['pending','Pagamentos pendentes'],['cancellations','Cancelamentos'],['upcoming7','Cobranças até 7 dias'],['upcoming30','Cobranças até 30 dias']];
function Cards({data,compact=false}) {return <div className={styles.metricGrid}>{(compact?metrics.filter(([key])=>['new_month','revenue_month','active','upcoming7'].includes(key)):metrics).map(([key,label,currency])=><MetricCard key={key} label={label} value={currency?money(data[key]):data[key]} icon="chart" note={key.endsWith('month')?'Mês corrente':key==='mrr'?'Previsão em BRL':key.startsWith('upcoming')?'Inclui hoje':'Histórico completo'}/>)}</div>;}
export function SalesDashboard({api}) {
  const [data,setData]=useState(null),[error,setError]=useState('');
  useEffect(()=>{const controller=new AbortController();api('vendas/resumo',{signal:controller.signal}).then(setData).catch(e=>{if(e.name!=='AbortError')setError('Não foi possível carregar o resumo de vendas.');});return()=>controller.abort();},[api]);
  return <section className={styles.panel}><h2>Vendas e assinaturas</h2>{error&&<p role="alert">{error}</p>}{data&&<Cards data={data} compact/>}<a href="/admin/vendas">Ver todas as vendas</a></section>;
}
function Pages({data,onPage}) {return <div className={styles.actions}><button disabled={data.page<=1} onClick={()=>onPage(data.page-1)}>Anterior</button><span>Página {data.page} · {data.total} registros</span><button disabled={data.page*data.limit>=data.total} onClick={()=>onPage(data.page+1)}>Próxima</button></div>;}
function Details({data}) {
  const r=data.record;
  const fields=[['Cliente',r.customer_name||'Não informado'],['E-mail',r.payer_email],['Telefone',r.phone],['CPF/CNPJ',r.document],['Plano',r.plan_name],['Valor mensal',money(r.amount_cents,r.currency)],['Duração',r.cycles?`${r.cycles} meses`:'Não informada'],['Cobranças previstas',r.cycles],['Cobranças realizadas',r.charges],['Ciclos pagos',r.paid_cycles],['Total recebido',money(r.total_paid,r.total_paid_currency)],['Restante previsto',money(r.remaining_amount,r.currency)],['Status',labels[r.status]||r.status],['ID interno / Mercado Pago preapproval ID',r.id],['Referência externa',r.external_reference],['Contratação',date(r.created_at)],['Próxima cobrança',date(r.next_payment_date)],['Término previsto',date(r.end_date)],['Cancelamento',date(r.cancelled_at)]];
  return <><a href="/admin/vendas">← Voltar às vendas</a><section className={styles.panel}><h2>Detalhes da assinatura</h2><dl className={styles.details}>{fields.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value??'Não informado'}</dd></div>)}</dl><p className={styles.help}>Previsões não são pagamentos confirmados. Valores e datas ausentes aguardam confirmação do Mercado Pago.</p></section>
    <section className={styles.panel}><h2>Histórico de cobranças</h2><Table columns={['Data','Valor','Status','Payment ID','Forma de pagamento','Últimos 4 dígitos','Motivo / status_detail','Referência','Aprovação','Estorno','Valor estornado']} rows={data.payments.map(p=>[date(p.created_at),money(p.amount_cents,p.currency),badge(p.status),p.id,p.payment_method,p.last_four,p.status_detail,p.external_reference,date(p.paid_at),date(p.refunded_at),money(p.refunded_cents,p.currency)])}/></section>
    <section className={styles.panel}><h2>Faturas confirmadas</h2><Table columns={['ID','Data de débito','Status']} rows={data.invoices.map(i=>[i.id,date(i.debit_date),badge(i.status)])}/></section>
    <section className={styles.panel}><h2>Comunicações</h2><Table columns={['Data','Tipo','Destinatário','Status']} rows={data.communications.map(n=>[date(n.sent_at||n.created_at),labels[n.type]||n.type,n.recipient,badge(n.state)])}/></section></>;
}
export default function SalesSection({api,recordId}) {
  const [data,setData]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[version,setVersion]=useState(0),[sync,setSync]=useState(null);
  const [filters,setFilters]=useState({plan:'',status:'',payment:'',q:'',start:'',end:'',page:1,due:'30',due_page:1});
  const query=new URLSearchParams(Object.entries(filters).filter(([,v])=>v!=='')).toString();
  useEffect(()=>{const c=new AbortController();setLoading(true);setError('');api(recordId?'vendas/'+encodeURIComponent(recordId):'vendas?'+query,{signal:c.signal}).then(setData).catch(e=>{if(e.name!=='AbortError')setError(e.message);}).finally(()=>{if(!c.signal.aborted)setLoading(false);});return()=>c.abort();},[api,recordId,query,version]);
  useEffect(()=>{const timer=setInterval(()=>{if(!document.hidden&&!busy)setVersion(v=>v+1);},30000);return()=>clearInterval(timer);},[busy]);
  const filter=(key,value)=>setFilters(f=>({...f,[key]:value,page:1}));
  async function synchronize() {
    setBusy(true);setError('');let next={},result={verified:0,updated:0,new_payments:0,errors:[]};setSync(result);
    try {do {const page=await api('vendas/sync',{method:'POST',body:JSON.stringify(next)});result={verified:result.verified+page.verified,updated:result.updated+page.updated,new_payments:result.new_payments+page.new_payments,errors:[...result.errors,...page.errors]};setSync(result);next=page.next;}while(next);}
    catch(e){setError(e.message);}finally{setBusy(false);setVersion(v=>v+1);}
  }
  return <>{!recordId&&<div className={styles.actions}><button disabled={busy} onClick={synchronize}>{busy?'Sincronizando…':'Sincronizar com Mercado Pago'}</button><button disabled={busy} onClick={()=>setVersion(v=>v+1)}>Atualizar painel</button></div>}
    {sync&&<div className={styles.panel} role="status"><p>Verificadas: {sync.verified} · Atualizadas: {sync.updated} · Pagamentos novos: {sync.new_payments} · Erros: {sync.errors.length}</p>{sync.errors.map((e,i)=><p key={i}>{e.subscription_id}: {e.message}</p>)}</div>}
    {error&&<p className={styles.error} role="alert">{error}</p>}{loading&&!data&&<LoadingState/>}
    {data&&recordId&&<Details data={data}/>}
    {data&&!recordId&&<><Cards data={data.summary}/><p className={styles.help}>Receita em BRL, líquida dos estornos registrados; mês corrente no horário de São Paulo. As demais contagens consideram todo o histórico. {data.summary.unknown_amounts>0&&`${data.summary.unknown_amounts} assinaturas ativas ainda sem valor confirmado.`}</p>
      <section className={styles.panel}><h2>Assinaturas</h2><form className={styles.filters} onSubmit={e=>e.preventDefault()}>
        <label>Plano<select value={filters.plan} onChange={e=>filter('plan',e.target.value)}><option value="">Todos</option><option value="basico">Básico</option><option value="professional">Professional</option><option value="business">Business</option></select></label>
        <label>Status<select value={filters.status} onChange={e=>filter('status',e.target.value)}><option value="">Todos</option>{['authorized','pending','rejected','cancelled','paused','finished','overdue'].map(s=><option key={s} value={s}>{labels[s]}</option>)}</select></label>
        <label>Pagamentos<select value={filters.payment} onChange={e=>filter('payment',e.target.value)}><option value="">Todos</option><option value="approved">Aprovados</option><option value="rejected">Recusados</option><option value="pending">Pendentes</option></select></label>
        <label>Pesquisar cliente, e-mail ou referência<input value={filters.q} maxLength={100} onChange={e=>filter('q',e.target.value)}/></label>
        <label>Contratação desde<input type="date" value={filters.start} onChange={e=>filter('start',e.target.value)}/></label><label>Até<input type="date" value={filters.end} onChange={e=>filter('end',e.target.value)}/></label>
      </form>
      {!data.total?<p>{Object.entries(filters).some(([k,v])=>['plan','status','payment','q','start','end'].includes(k)&&v)?'Nenhuma assinatura corresponde aos filtros.':'Nenhuma assinatura registrada ainda.'}</p>:<Table columns={['Cliente','E-mail','Plano','Valor mensal','Contratação','Status','Cobranças','Total pago','Próxima cobrança','Última cobrança','Último status','Preapproval ID','Referência','Detalhes']} rows={data.rows.map(r=>[r.customer_name||'Não informado',r.payer_email,r.plan_name,money(r.amount_cents,r.currency),date(r.created_at),badge(r.status),r.charges,money(r.total_paid,r.total_paid_currency),date(r.next_payment_date),date(r.last_payment_date),badge(r.last_payment_status),r.id,r.external_reference,<a href={'/admin/vendas/'+encodeURIComponent(r.id)}>Ver detalhes</a>])}/>}
      <Pages data={data} onPage={page=>setFilters(f=>({...f,page}))}/></section>
      <section className={styles.panel}><h2>Próximos vencimentos</h2><div className={styles.periodTabs}>{[['today','Hoje'],['7','Próximos 7 dias'],['30','Próximos 30 dias']].map(([key,label])=><button key={key} aria-pressed={filters.due===key} onClick={()=>setFilters(f=>({...f,due:key,due_page:1}))}>{label}</button>)}</div><p className={styles.help}>Datas informadas pelo Mercado Pago para assinaturas ativas. Os períodos incluem hoje.</p><Table columns={['Cliente','Plano','Valor','Próxima cobrança','Status','Cobranças restantes']} rows={data.upcoming.rows.map(r=>[r.customer_name||r.payer_email,r.plan_name,money(r.amount_cents,r.currency),date(r.next_payment_date),badge(r.status),r.remaining_cycles])}/><Pages data={data.upcoming} onPage={due_page=>setFilters(f=>({...f,due_page}))}/></section>
    </>}
  </>;
}
