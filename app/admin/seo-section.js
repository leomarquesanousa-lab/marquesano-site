import { useState } from 'react';
import styles from './admin.module.css';
import IntegrationStatus from './integration-status.js';
import { Badge, MetricCard, ChartPanel, BarChart } from './visuals.js';
import { Table, GoogleData, reportRows } from './report-sections.js';

const issues=page=>[!page.title&&'title',!page.description&&'description',!page.canonical&&'canonical',page.h1!==null&&page.h1!==1&&'h1',page.missingAlt>0&&'alt'].filter(Boolean);
export default function SeoSection({ data, onRefresh, onDiagnose }) {
  const [filter,setFilter]=useState('all'),[search,setSearch]=useState('');
  const pages=data.pages.filter(p=>p.path.toLowerCase().includes(search.toLowerCase())&&(filter==='all'||filter==='problems'&&issues(p).length||filter==='unchecked'&&(p.h1===null||p.missingAlt===null)||filter==='noindex'&&!p.indexable||issues(p).includes(filter)));
  const h1=data.pages.filter(p=>p.h1!==null&&p.h1!==1).length,alt=data.pages.reduce((n,p)=>n+(p.missingAlt||0),0),partial=data.pages.some(p=>p.h1===null||p.missingAlt===null);
  const count=data.missingTitle+data.missingDescription+data.missingCanonical+h1+alt;
  const health=partial?'Parcial':data.total?Math.round(data.pages.filter(p=>!issues(p).length).length/data.total*100)+'%':'—';
  const summary=data.google?.reports?.summary?.rows?.[0];
  return <>
    <div className={styles.reportToolbar}><div><Badge tone={count?'warning':partial?'neutral':'positive'}>{count?'Atenção':partial?'Análise parcial':'Saúde técnica em dia'}</Badge><span className={styles.toolbarNote}>{data.domain}</span></div><button onClick={onDiagnose}>Verificar sitemap e robots</button></div>
    <div className={styles.metricGrid}><MetricCard label="Saúde técnica" value={health} note={partial?'HTML ainda não verificado':'Páginas sem problemas detectados'} icon="shield"/><MetricCard label="URLs analisadas" value={data.total} icon="pages"/><MetricCard label="Páginas indexáveis" value={data.indexable} note="Permitem indexação; não confirma presença no Google" icon="globe"/><MetricCard label="Problemas detectados" value={count} note="Ocorrências nos itens verificados" icon="target"/></div>
    <div className={styles.metricGrid}>{[['Sem title',data.missingTitle],['Sem description',data.missingDescription],['Sem canonical',data.missingCanonical],['Problemas de H1',partial&&h1===0?'—':h1],['Imagens sem alt',partial&&alt===0?'—':alt]].map(([label,value])=><MetricCard key={label} label={label} value={value} note={partial?'Verificação disponível no momento':'Diagnóstico das páginas'} icon="pages"/>)}</div>
    <section className={styles.panel}><header className={styles.sectionHeading}><div><h2>Diagnóstico das páginas</h2><p>{partial?'Metadados da fonte; H1 e imagens dependem de HTML disponível.':'Diagnóstico baseado no HTML do último build disponível.'}</p></div><div className={styles.actions}><a className={styles.secondaryLink} href={data.sitemap} target="_blank" rel="noreferrer">Sitemap ↗</a><a className={styles.secondaryLink} href={data.robots} target="_blank" rel="noreferrer">Robots ↗</a></div></header>
      <div className={styles.filters}><label>Página<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar URL"/></label><label>Diagnóstico<select value={filter} onChange={e=>setFilter(e.target.value)}>{[['all','Todas as páginas'],['problems','Com problemas'],['title','Sem title'],['description','Sem description'],['canonical','Sem canonical'],['h1','Problemas de H1'],['alt','Imagens sem alt'],['noindex','Não indexáveis'],['unchecked','HTML não verificado']].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><span className={styles.help}>{pages.length} páginas</span></div>
      <Table columns={['Página','Status','Metadados','H1 / imagens','Indexabilidade']} rows={pages.map(p=>{
        const errors=!p.title||!p.description||!p.canonical,warnings=issues(p).length||p.h1===null||p.missingAlt===null;
        return [<a href={p.path} target="_blank" rel="noreferrer">{p.path}</a>,<Badge tone={errors?'negative':warnings?'warning':'positive'}>{errors?'Erro':warnings?'Atenção':'OK'}</Badge>,<details className={styles.cellDetail}><summary>{p.title||'Título ausente'}</summary><p><b>Description:</b> {p.description||'Ausente'}</p><p><b>Canonical:</b> {p.canonical||'Ausente'}</p></details>,<><span>H1: {p.h1??'Não verificado'}</span><br/><small>Sem alt: {p.missingAlt??'Não verificado'}</small></>,<Badge tone={p.indexable?'positive':'neutral'}>{p.indexable?'Indexável':'Noindex'}</Badge>];
      })}/>
      {data.published&&<Table columns={['Arquivo publicado','HTTP','Resultado']} rows={Object.values(data.published).map(p=>[<a href={p.url} target="_blank" rel="noreferrer">{p.url}</a>,p.status||'Sem resposta',<Badge tone={p.ok?'positive':'negative'}>{p.ok?'OK':'Erro'}</Badge>])}/>}
    </section>
    <section className={styles.panel}><header className={styles.sectionHeading}><div><h2>Google Search Console</h2><p>Desempenho da pesquisa orgânica</p></div><IntegrationStatus integration={data.integrations.gsc} result={data.google}/></header><div className={styles.actions}><button disabled={data.integrations.gsc.status==='Não configurado'} onClick={onRefresh}>Atualizar dados</button></div>
      {data.google?.message&&<div className={styles.error} role="alert">{data.google.message}</div>}
      {!data.google?.reports&&!data.google?.message&&<p className={styles.help}>Não conectado. Nenhum relatório disponível.</p>}
      {summary&&<div className={styles.metricGrid}>{[['Cliques',summary[0]],['Impressões',summary[1]],['CTR',(Number(summary[2])*100).toFixed(1)+'%'],['Posição média',Number(summary[3]).toFixed(1)]].map(([label,value])=><MetricCard key={label} label={label} value={value} note="Google Search Console"/>)}</div>}
    </section>
    {data.google?.reports&&<><div className={styles.chartGrid}><ChartPanel title="Consultas de pesquisa" subtitle="Cliques"><BarChart rows={reportRows(data.google.reports.queries,'query','cliques')} unit="cliques"/></ChartPanel><ChartPanel title="Páginas na pesquisa" subtitle="Cliques"><BarChart rows={reportRows(data.google.reports.pages,'page','cliques')} unit="cliques"/></ChartPanel></div><GoogleData data={data.google}/></>}
  </>;
}
