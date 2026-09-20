import styles from './admin.module.css';
import IntegrationStatus from './integration-status.js';
import { MetricCard, ChartPanel, LineChart, BarChart, Distribution, EmptyState, number } from './visuals.js';

export function Table({ columns, rows }) {
  return rows?.length?<div className={styles.tableWrap}><table><thead><tr>{columns.map(c=><th key={c} scope="col">{c}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{cell??'—'}</td>)}</tr>)}</tbody></table></div>:<EmptyState title="Nenhum resultado" description="Não há registros para os filtros selecionados."/>;
}
const names={summary:'Resumo',timeline:'Tráfego diário',acquisition:'Aquisição',pages:'Páginas',devices:'Dispositivos',countries:'Países',events:'Eventos',queries:'Consultas'};
const columns={activeUsers:'Usuários ativos',sessions:'Sessões',screenPageViews:'Visualizações',keyEvents:'Eventos principais',eventCount:'Eventos',newUsers:'Novos usuários',sessionKeyEventRate:'Taxa de conversão por sessão',sessionSource:'Origem',sessionMedium:'Mídia',sessionCampaignName:'Campanha',pagePath:'Página',deviceCategory:'Dispositivo',country:'País',eventName:'Evento',query:'Consulta',page:'Página',device:'Dispositivo',date:'Data'};
export function GoogleData({ data }) {
  if(!data?.reports)return null;
  return <section className={styles.panel}><header className={styles.sectionHeading}><div><h2>Detalhamento dos relatórios</h2><p>Explore os resultados por dimensão.</p></div></header>{Object.entries(data.reports).map(([name,report])=><details className={styles.reportDetail} key={name}><summary>{names[name]||name}<span>{report.rows.length} registros</span></summary><Table columns={report.columns.map(c=>columns[c]||c)} rows={report.rows.map(row=>row.map((value,i)=>['sessionKeyEventRate','CTR'].includes(report.columns[i])?number(Number(value)*100)+'%':value))}/>{report.rowCount>report.rows.length&&<p className={styles.help}>Exibindo {report.rows.length} de {report.rowCount} resultados.</p>}</details>)}</section>;
}
export function reportRows(report, dimension, metric) {
  if(!report)return [];
  const labelIndex=report.columns.indexOf(dimension),valueIndex=report.columns.indexOf(metric);
  if(labelIndex<0||valueIndex<0)return [];
  return report.rows.map(row=>({label:String(row[labelIndex]||'Não informado'),value:Number(row[valueIndex])||0}));
}
function metric(report,key) {const index=report?.columns.indexOf(key)??-1;return index<0?null:Number(report.rows[0]?.[index]||0);}
function trafficRows(data,reports) {
  const rows=reports?reportRows(reports.timeline,'date','activeUsers').map(r=>({...r,label:r.label.replace(/^(\d{4})(\d{2})(\d{2})$/,'$1-$2-$3')})):(data.traffic||[]).map(r=>({label:r.day,value:r.visitors}));
  if(!rows.length)return [];
  const days=new Map(rows.map(r=>[r.label,r.value])),filled=[];
  for(let day=Date.parse(data.period.start),end=Date.parse(data.period.end);day<=end;day+=86400000){const key=new Date(day).toISOString().slice(0,10);filled.push({label:key.slice(8,10)+'/'+key.slice(5,7),value:days.get(key)||0});}
  return filled;
}
function ReportView({ data, onRefresh, detailed=false }) {
  const reports=data.google?.status==='Ativo'?data.google.reports:null;
  const ga=Boolean(reports),summary=reports?.summary;
  const visitors=ga?metric(summary,'activeUsers'):data.counts.visitors,views=ga?metric(summary,'screenPageViews'):data.counts.page_views,source=ga?'Google Analytics':'Coleta local';
  const cards=[{label:'Visitantes',value:visitors,icon:'users'},{label:'Visualizações',value:views,icon:'pages'},{label:'Sessões',value:metric(summary,'sessions'),icon:'pulse',note:ga?source:'Disponível com GA4'}];
  if(detailed)cards.push({label:'Novos usuários',value:metric(summary,'newUsers'),icon:'users'},{label:'Eventos',value:ga?metric(summary,'eventCount'):data.events.reduce((n,r)=>n+r.total,0),icon:'target'});
  else cards.push({label:ga?'Eventos principais':'Formulários recebidos',value:ga?metric(summary,'keyEvents'):data.counts.forms,icon:'target'});
  if(ga){const rate=metric(summary,'sessionKeyEventRate');cards.push({label:'Taxa de conversão',value:rate==null?'—':number(rate*100)+'%',icon:'chart',note:'Sessões com evento principal'});}
  const devices=reportRows(reports?.devices,'deviceCategory','sessions').map(r=>({...r,label:({desktop:'Computador',mobile:'Celular',tablet:'Tablet'})[r.label]||r.label}));
  const countries=reportRows(reports?.countries,'country','sessions'),pages=ga?reportRows(reports.pages,'pagePath','screenPageViews'):data.pages.map(r=>({label:r.label,value:r.views}));
  return <>
    <div className={styles.reportToolbar}><div className={styles.integrationInline}><span className={styles.googleMark}>G</span><div><strong>Google Analytics</strong><IntegrationStatus integration={data.integrations.ga4} result={data.google}/></div></div><div className={styles.toolbarActions}><span className={styles.help}>{data.period.start.split('-').reverse().join('/')} – {data.period.end.split('-').reverse().join('/')}</span><button onClick={onRefresh}>Atualizar dados</button></div></div>
    {data.google?.message&&<div role="alert" className={styles.error}>{data.google.message}</div>}
    <div className={styles.metricGrid}>{cards.map(card=><MetricCard key={card.label} {...card} note={card.note||source}/>)}</div>
    <p className={styles.sourceNote}>{source} · {ga?`Fuso: ${summary?.timeZone||'da propriedade'}`:'UTC · visitantes identificados pelo navegador'}{data.google?.updatedAt&&` · Atualizado às ${new Date(data.google.updatedAt).toLocaleTimeString('pt-BR')}`}</p>
    <div className={styles.chartGrid}>
      <ChartPanel title="Tráfego ao longo do tempo" subtitle="Visitantes por dia"><LineChart rows={trafficRows(data,reports)}/></ChartPanel>
      <ChartPanel title="Páginas mais acessadas" subtitle="Visualizações por página"><BarChart rows={pages}/></ChartPanel>
      <ChartPanel title="Dispositivos" subtitle="Distribuição de sessões">{ga?<Distribution rows={devices}/>:<EmptyState title="Dados de dispositivos indisponíveis" description="Essa dimensão depende dos relatórios do Google Analytics."/>}</ChartPanel>
      <ChartPanel title="Países" subtitle="Sessões por país">{ga?<BarChart rows={countries} unit="sessões"/>:<EmptyState title="Dados de países indisponíveis" description="Essa dimensão depende dos relatórios do Google Analytics."/>}</ChartPanel>
      {detailed&&<><ChartPanel title="Aquisição" subtitle="Sessões por origem e mídia"><BarChart rows={reports?.acquisition?Object.entries(reports.acquisition.rows.reduce((out,row)=>{const key=`${row[0]} / ${row[1]}`;out[key]=(out[key]||0)+Number(row[reports.acquisition.columns.indexOf('sessions')]||0);return out;},{})).map(([label,value])=>({label,value})):[]} unit="sessões"/></ChartPanel><ChartPanel title="Eventos" subtitle={source}><BarChart rows={ga?reportRows(reports.events,'eventName','eventCount'):data.events.map(r=>({label:r.label,value:r.total}))} unit="eventos"/></ChartPanel></>}
    </div>{detailed&&<GoogleData data={data.google}/>}
  </>;
}
export function OverviewSection(props){return <ReportView {...props}/>;}
export function AnalyticsSection(props){return <ReportView {...props} detailed/>;}
