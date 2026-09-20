import { useId } from 'react';
import styles from './admin.module.css';

export const number=value=>value==null?'—':Number(value).toLocaleString('pt-BR',{maximumFractionDigits:1});
export function Icon({ name='chart' }) {
  const paths={chart:'M4 19V5m0 14h16M8 15l4-5 4 2 4-7',users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8m10 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',pages:'M7 3h8l4 4v14H5V3h2m8 0v5h4M8 12h8m-8 4h6',pulse:'M3 12h4l3-8 4 16 3-8h4',globe:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18',target:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0m-5 0a4 4 0 1 1-8 0 4 4 0 0 1 8 0',shield:'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3m-4 9 3 3 5-6',settings:'M4 7h16M4 17h16M8 4v6m8 4v6',ads:'M3 10v5h4l10 5V5L7 10H3m4 5 2 6h3l-2-5',audit:'M5 3h14v18H5V3m4 5h6m-6 4h6m-6 4h4'};
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]||paths.chart}/></svg>;
}
export function Badge({ children, tone='neutral' }) {return <span className={`${styles.badge} ${styles[tone]||''}`}><i aria-hidden="true"/>{children}</span>;}
export function EmptyState({ title='Nenhum dado neste período', description='Os resultados aparecerão aqui quando houver atividade.', icon='chart' }) {
  return <div className={styles.emptyState}><span className={styles.emptyIcon}><Icon name={icon}/></span><strong>{title}</strong><p>{description}</p></div>;
}
export function MetricCard({ label, value, note, icon='chart' }) {
  return <article className={styles.metricCard}><div className={styles.metricHeading}><span>{label}</span><Icon name={icon}/></div><strong>{typeof value==='number'?number(value):value??'—'}</strong><small>{note||'No período selecionado'}</small></article>;
}
export function ChartPanel({ title, subtitle, children, wide=false, action }) {
  return <section className={`${styles.chartPanel} ${wide?styles.wide:''}`}><header className={styles.sectionHeading}><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div>{action}</header>{children}</section>;
}
export function LoadingState() {return <div role="status" aria-live="polite"><span className={styles.help}>Atualizando seu painel…</span><div className={styles.metricGrid}>{[1,2,3,4].map(i=><div key={i} className={styles.skeleton}/>)}</div><div className={`${styles.skeleton} ${styles.skeletonChart}`}/></div>;}
export function LineChart({ rows, label='Visitantes' }) {
  const id=useId().replace(/:/g,'');
  if(!rows.length||!rows.some(r=>r.value>0))return <EmptyState description="Ainda não há tráfego registrado para as datas selecionadas."/>;
  const max=Math.max(1,...rows.map(r=>r.value)),x=i=>48+(rows.length===1?0.5:i/(rows.length-1))*680,y=v=>195-v/max*160;
  const points=rows.map((r,i)=>`${x(i)},${y(r.value)}`).join(' '),markers=[...new Set([0,Math.floor((rows.length-1)/2),rows.length-1])];
  return <div className={styles.lineChart}><svg viewBox="0 0 760 240" role="img" aria-label={`${label} por dia, de ${rows[0].label} a ${rows.at(-1).label}`}>
    <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3877ed" stopOpacity=".22"/><stop offset="100%" stopColor="#3877ed" stopOpacity="0"/></linearGradient></defs>
    {[0,.5,1].map(t=><g key={t}><line x1="48" x2="728" y1={y(max*t)} y2={y(max*t)} stroke="#e8edf5" strokeDasharray="4 5"/><text x="36" y={y(max*t)+4} textAnchor="end">{number(max*t)}</text></g>)}
    <polygon points={`${x(0)},195 ${points} ${x(rows.length-1)},195`} fill={`url(#${id})`}/><polyline points={points} fill="none" stroke="#3272ea" strokeWidth="3" strokeLinejoin="round"/>
    {rows.map((r,i)=><circle key={i} cx={x(i)} cy={y(r.value)} r={rows.length>90?2:3.5} fill="#3272ea"><title>{`${r.label}: ${number(r.value)} ${label.toLowerCase()}`}</title></circle>)}
    {markers.map(i=><text key={i} x={x(i)} y="226" textAnchor={i===0?'start':i===rows.length-1?'end':'middle'}>{rows[i].label}</text>)}
  </svg><details className={styles.chartValues}><summary>Ver valores do gráfico</summary><ul>{rows.map((r,i)=><li key={i}>{r.label}: {number(r.value)}</li>)}</ul></details></div>;
}
export function BarChart({ rows, unit='visualizações' }) {
  const sorted=rows.filter(r=>r.value>0).sort((a,b)=>b.value-a.value).slice(0,6);
  if(!sorted.length)return <EmptyState/>;
  return <div className={styles.barChart}>{sorted.map((row,i)=><div key={i}><div className={styles.barLabel}><span title={row.label}>{row.label}</span><strong>{number(row.value)}</strong></div><div className={styles.barTrack} role="img" aria-label={`${row.label}: ${number(row.value)} ${unit}`}><span style={{width:`${row.value/sorted[0].value*100}%`}}/></div></div>)}</div>;
}
export function Distribution({ rows }) {
  const sorted=rows.filter(r=>r.value>0).sort((a,b)=>b.value-a.value);
  if(!sorted.length)return <EmptyState/>;
  const shown=sorted.slice(0,4),rest=sorted.slice(4).reduce((n,r)=>n+r.value,0);
  if(rest)shown.push({label:'Outros',value:rest});
  const total=shown.reduce((n,r)=>n+r.value,0),colors=['#3272ea','#39b7b0','#9c83e8','#f2b35c','#b7c5d9'];let offset=0;
  return <div className={styles.distribution}><svg viewBox="0 0 120 120" role="img" aria-label="Distribuição dos resultados"><circle cx="60" cy="60" r="44" fill="none" stroke="#eef2f8" strokeWidth="15"/>{shown.map((r,i)=>{const percent=r.value/total*100,start=offset;offset+=percent;return <circle key={i} cx="60" cy="60" r="44" fill="none" stroke={colors[i]} strokeWidth="15" pathLength="100" strokeDasharray={`${percent} ${100-percent}`} strokeDashoffset={-start} transform="rotate(-90 60 60)"><title>{`${r.label}: ${number(percent)}%`}</title></circle>;})}<text x="60" y="58" textAnchor="middle" className={styles.donutValue}>{number(total)}</text><text x="60" y="74" textAnchor="middle">total</text></svg>
    <ul>{shown.map((r,i)=><li key={i}><span><i style={{background:colors[i]}}/>{r.label}</span><strong>{number(r.value/total*100)}%</strong></li>)}</ul>
  </div>;
}
