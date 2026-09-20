import { useEffect, useState } from 'react';
import styles from './admin.module.css';
import { Badge, MetricCard, EmptyState, LoadingState, number } from './visuals.js';
import { Table } from './report-sections.js';

const statuses={ACTIVE:'Ativa',PAUSED:'Pausada',ARCHIVED:'Arquivada',DELETED:'Excluída',IN_PROCESS:'Em processamento',WITH_ISSUES:'Com problemas'};
export default function MarketingSection({ data, user, api, period }) {
  const [report,setReport]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(false),[version,setVersion]=useState(0);
  const allowed=['OWNER','ADMIN'].includes(user.role),connected=data.meta.accountConnected,account=data.meta.selectedAccount;
  const query=new URLSearchParams(Object.entries(period||{}).filter(([,v])=>v!=='')).toString();
  useEffect(()=>{
    const controller=new AbortController();setReport(null);setError('');
    if(!allowed||!connected||!account){setLoading(false);return;}
    setLoading(true);
    api('meta/campaigns?'+query,{signal:controller.signal}).then(result=>{if(!controller.signal.aborted)setReport(result);}).catch(e=>{if(e.name!=='AbortError')setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[allowed,connected,account?.id,query,version,api]);
  const currency=report?.account.currency||account?.currency||'BRL';
  const money=value=>{if(value==null)return '—';try{return new Intl.NumberFormat('pt-BR',{style:'currency',currency}).format(value);}catch{return `${number(value)} ${currency}`;}};
  const budget=campaign=>{
    const value=campaign.dailyBudget||campaign.lifetimeBudget;if(!value)return 'No conjunto de anúncios';
    let decimals=2;try{decimals=new Intl.NumberFormat('en',{style:'currency',currency}).resolvedOptions().maximumFractionDigits;}catch{}
    return money(value/10**decimals)+(campaign.dailyBudget?' / dia':' total');
  };
  return <>
    <section className={styles.panel}><header className={styles.sectionHeading}><div><h2>Meta Ads</h2><p>Facebook e Instagram · leitura da conta de anúncios</p></div><Badge tone={connected?'positive':'neutral'}>{connected?'Conectado':'Não conectado'}</Badge></header>
      {!allowed?<p>Os dados e a conexão Meta estão disponíveis para OWNER e ADMIN.</p>:!connected?<><EmptyState title="Meta Ads não conectado" description="Autorize a leitura das contas e campanhas na Meta."/>{data.meta.oauthReady?<a className={styles.primaryLink} href="/api/admin/meta/connect">Conectar Meta</a>:<a className={styles.primaryLink} href="/admin/configuracoes#meta">Conectar Meta</a>}</>:!account?<><p>Selecione uma conta de anúncios para consultar os resultados.</p><a className={styles.primaryLink} href="/admin/configuracoes#meta">Selecionar conta de anúncios</a></>:<div className={styles.reportToolbar}><div><strong>{account.name}</strong><p className={styles.help}>{account.id} · {account.currency} · {account.timezone}</p></div><div className={styles.actions}><a className={styles.secondaryLink} href="/admin/configuracoes#meta">Gerenciar conexão</a><button disabled={loading} onClick={()=>setVersion(v=>v+1)}>Atualizar dados</button></div></div>}
      {data.meta.message&&<p className={styles.notice}>{data.meta.message}</p>}
    </section>
    {loading&&<LoadingState/>}{error&&<p role="alert" className={styles.error}>{error} <button onClick={()=>setVersion(v=>v+1)}>Tentar novamente</button></p>}
    {report&&<><div className={styles.metricGrid}>{[['Gasto',money(report.totals.spend)],['Impressões',number(report.totals.impressions)],['Alcance',number(report.totals.reach)],['Cliques',number(report.totals.clicks)],['CPC',money(report.totals.cpc)],['CPM',money(report.totals.cpm)],['CTR',report.totals.ctr==null?'—':number(report.totals.ctr)+'%']].map(([label,value])=><MetricCard key={label} label={label} value={value} note="Meta · período selecionado"/>)}</div>
      <section className={styles.panel}><header className={styles.sectionHeading}><div><h2>Campanhas</h2><p>{report.period.start} — {report.period.end} · fuso da conta</p></div><Badge>Somente leitura</Badge></header><Table columns={['Campanha','Status','Orçamento','Gasto','Impressões','Alcance','Cliques','CPC','CPM','CTR']} rows={report.rows.map(c=>[c.name,<Badge tone={c.status==='ACTIVE'?'positive':'neutral'}>{statuses[c.status]||c.status}</Badge>,budget(c),money(c.spend),number(c.impressions),number(c.reach),number(c.clicks),money(c.cpc),money(c.cpm),c.ctr==null?'—':number(c.ctr)+'%'])}/>{report.truncated&&<p className={styles.notice}>Relatório parcial: o limite de paginação foi atingido. Os totais da conta vêm de uma consulta independente.</p>}<p className={styles.help}>“—” indica que a Meta não retornou a métrica no período. Orçamentos refletem a configuração atual da campanha.</p></section></>}
    <section className={styles.panel}><header className={styles.sectionHeading}><h2>Google Ads</h2><Badge>Integração futura</Badge></header></section>
  </>;
}
