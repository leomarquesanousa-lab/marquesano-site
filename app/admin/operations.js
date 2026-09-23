'use client';
import { useEffect, useState } from 'react';
import styles from './admin.module.css';
import SeoSection from './seo-section.js';
import MarketingSection from './marketing-section.js';
import { Badge, LoadingState } from './visuals.js';
import SettingsIntegrations from './settings-integrations.js';
import PaymentSettings from './payment-settings.js';
import SalesSection, { SalesDashboard } from './sales-section.js';
import UsersSection from './users-section.js';
import { OverviewSection, AnalyticsSection, Table } from './report-sections.js';
const userAuditActions={user_created:'Usuário criado',user_updated:'Usuário editado',user_role_changed:'Role alterada',user_activated:'Usuário ativado',user_deactivated:'Usuário desativado',user_password_reset:'Senha redefinida',user_deleted:'Usuário excluído'};

const labels={NEW:'Novo',CONTACTED:'Contatado',QUALIFIED:'Qualificado',PROPOSAL:'Proposta',WON:'Ganho',LOST:'Perdido',ARCHIVED:'Arquivado',ACTIVE:'Ativo',INACTIVE:'Inativo',PROSPECT:'Prospect',DRAFT:'Rascunho',PAUSED:'Pausada',FINISHED:'Finalizada',LOW:'Baixa',NORMAL:'Normal',HIGH:'Alta',PENDING:'Pendente',SENT:'Enviado',FAILED:'Falhou',UNKNOWN:'Sem confirmação'};
const statuses={leads:['NEW','CONTACTED','QUALIFIED','PROPOSAL','WON','LOST','ARCHIVED'],clientes:['ACTIVE','INACTIVE','PROSPECT','ARCHIVED'],campanhas:['DRAFT','ACTIVE','PAUSED','FINISHED','ARCHIVED']};
const names={leads:'lead',clientes:'cliente',campanhas:'campanha',usuarios:'usuário'};
const date=value=>value?new Date(value).toLocaleString('pt-BR'):'—';
const val=value=>value===null||value===undefined?'—':String(value);
async function api(path,options={}) {
  const response=await fetch('/api/admin/'+path,{cache:'no-store',...options,headers:{'Content-Type':'application/json',...options.headers}});
  if(response.status===401){window.location.assign('/admin/login');throw Error('Sessão expirada.');}
  const result=await response.json().catch(()=>({error:'Acesso não permitido ou serviço indisponível.'}));
  if(!response.ok)throw Error(result.error||'Não foi possível concluir.');return result;
}
export function PaymentsPage() { return <PaymentSettings api={api}/>; }
export function SalesPage({recordId}) { return <SalesSection api={api} recordId={recordId}/>; }
export function UsersPage({user}) { return <UsersSection api={api} user={user}/>; }

export default function Operations({module,user,recordId}) {
  const [data,setData]=useState(null),[detail,setDetail]=useState(null),[editing,setEditing]=useState(null),[message,setMessage]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[version,setVersion]=useState(0);
  const [filters,setFilters]=useState({days:'30',start:'',end:'',q:'',status:'',sort:'newest',page:1}),[remote,setRemote]=useState(false),[diagnose,setDiagnose]=useState(false);
  const params=new URLSearchParams(Object.entries(filters).filter(([,v])=>v!==''));if(remote||['dashboard','analytics','seo'].includes(module))params.set('remote','1');if(diagnose)params.set('diagnose','1');const query=params.toString();
  const canWrite=user.role!=='VIEWER';
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError('');
    Promise.all([api(module+'?'+query,{signal:controller.signal}),recordId?api(module+'/'+recordId,{signal:controller.signal}):Promise.resolve(null)])
      .then(([result,record])=>{setData(result);setDetail(record);})
      .catch(e=>{if(e.name!=='AbortError')setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[module,recordId,query,version]);
  async function mutate(path,body,method='POST') {
    setBusy(true);setError('');setMessage('');
    try{const result=await api(path,{method,body:JSON.stringify(body)});setMessage('Alteração salva.');setEditing(null);setVersion(v=>v+1);return result;}
    catch(e){setError(e.message);return null;}finally{setBusy(false);}
  }
  function updateFilter(key,value) {setFilters({...filters,[key]:value,page:1});setRemote(false);}
  const rows=data?.rows||[],record=detail?.record;
  async function save(event) {
    event.preventDefault();const form=event.currentTarget,body=Object.fromEntries(new FormData(form));
    if(module==='usuarios'){body.active=form.elements.active.checked;if(!window.confirm('Confirmar alteração de acesso administrativo? Sessões existentes deste usuário serão encerradas.'))return;}
    if(body.status==='ARCHIVED'&&!window.confirm('Arquivar este registro? Ele continuará no histórico e poderá ser restaurado.'))return;
    if(!editing.id&&!['campanhas','usuarios'].includes(module))return;
    await mutate(module+(editing.id?'/'+editing.id:''),body,editing.id?'PATCH':'POST');
  }
  const campaignUrl=row=>{const url=new URL(row.landing_page||'/','https://marquesano.com.br');for(const [key,value]of Object.entries({utm_source:row.source,utm_medium:row.medium,utm_campaign:row.slug}))url.searchParams.set(key,value);return url.href;};
  const field=(key,label,type='text',required=false,maxLength=200)=><label key={key}>{label}<input name={key} type={type} required={required} maxLength={maxLength} defaultValue={editing?.[key]||''} minLength={key==='password'?12:undefined} autoComplete={key==='password'?'new-password':undefined}/></label>;
  const area=(key,label,maxLength=4000)=><label key={key}>{label}<textarea name={key} defaultValue={editing?.[key]||''} maxLength={maxLength} rows={4}/></label>;
  return <>
    {module==='dashboard'&&['OWNER','ADMIN'].includes(user.role)&&<SalesDashboard api={api}/>}
    {recordId&&<nav className={styles.breadcrumb} aria-label="Breadcrumb"><a href={'/admin/'+module}>{module}</a><span>/</span><span>Detalhes</span></nav>}
    {!['configuracoes','usuarios'].includes(module)&&<form className={styles.filters} onSubmit={e=>e.preventDefault()}>
      <div className={styles.periodTabs} role="group" aria-label="Período">{[['1','Hoje'],['7','7 dias'],['30','30 dias'],['90','90 dias']].map(([v,l])=><button type="button" key={v} aria-pressed={filters.days===v&&!filters.start&&!filters.end} onClick={()=>{setFilters({...filters,days:v,start:'',end:'',page:1});setRemote(false);}}>{l}</button>)}</div>
      <label>De<input type="date" value={filters.start} onChange={e=>updateFilter('start',e.target.value)}/></label><label>Até<input type="date" value={filters.end} onChange={e=>updateFilter('end',e.target.value)}/></label>
      {['leads','clientes','campanhas','formularios'].includes(module)&&<label>Pesquisar<input value={filters.q} onChange={e=>updateFilter('q',e.target.value)} maxLength={100} placeholder="Nome ou e-mail"/></label>}
      {statuses[module]&&<label>Status<select value={filters.status} onChange={e=>updateFilter('status',e.target.value)}><option value="">Todos</option>{statuses[module].map(s=><option key={s} value={s}>{labels[s]}</option>)}</select></label>}
      {module==='auditoria'&&<><label>Usuário<input placeholder="E-mail ou Sistema" value={filters.q} maxLength={100} onChange={e=>updateFilter('q',e.target.value)}/></label><label>Ação<select value={filters.action||''} onChange={e=>updateFilter('action',e.target.value)}>{[['','Todas'],['login','Entrada'],['logout','Saída'],['create','Criação'],['update','Edição'],['settings','Configuração'],['convert','Conversão'],['note','Nota'],...Object.entries(userAuditActions)].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label>Entidade<select value={filters.entity||''} onChange={e=>updateFilter('entity',e.target.value)}>{[['','Todas'],['auth','Autenticação'],['usuarios','Usuários'],['configuracoes','Configurações'],['leads','Leads'],['clientes','Clientes'],['campanhas','Campanhas']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label></>}
      {names[module]&&<label>Ordenar<select value={filters.sort} onChange={e=>updateFilter('sort',e.target.value)}><option value="newest">Mais recentes</option><option value="oldest">Mais antigos</option></select></label>}
      {(filters.start||filters.end||filters.q||filters.action||filters.entity||filters.status)&&<button type="button" onClick={()=>setFilters({days:'30',start:'',end:'',q:'',status:'',sort:'newest',page:1})}>Limpar filtros</button>}
    </form>}
    {error&&<p role="alert" className={styles.error}>{error} <button onClick={()=>setVersion(v=>v+1)}>Tentar novamente</button></p>}
    {message&&<p role="status" className={styles.success}>{message}</p>}
    {loading&&<LoadingState/>}
    {!loading&&data&&<>
      {module==='dashboard'&&<OverviewSection data={data} onRefresh={()=>setVersion(v=>v+1)}/>}
      {module==='analytics'&&<AnalyticsSection data={data} onRefresh={()=>{setRemote(true);setVersion(v=>v+1);}}/>}
      {module==='seo'&&<SeoSection data={data} onRefresh={()=>setVersion(v=>v+1)} onDiagnose={()=>{setDiagnose(true);setVersion(v=>v+1);}}/>}
      {module==='marketing'&&<MarketingSection data={data} user={user} api={api} period={{days:filters.days,start:filters.start,end:filters.end}}/>}
      {module==='configuracoes'&&<SettingsIntegrations data={data} user={user} api={api}/>}
      {names[module]&&<div className={styles.actions}>{!recordId&&canWrite&&['campanhas','usuarios'].includes(module)&&<button onClick={()=>setEditing(module==='usuarios'?{active:true,role:'VIEWER'}:{landing_page:'/'})}>Novo {names[module]}</button>}{record&&canWrite&&<button onClick={()=>setEditing(record)}>Editar {names[module]}</button>}</div>}
      {record&&<section className={styles.panel}><h2>{record.name}</h2><dl className={styles.details}>{Object.entries(record).filter(([key])=>!['identity_key','first_touch','last_touch','company_id','visitor_id'].includes(key)).map(([key,value])=><div key={key}><dt>{({name:'Nome',email:'E-mail',phone:'Telefone',whatsapp:'WhatsApp',message:'Mensagem',interest:'Interesse',company:'Empresa',status:'Status',created_at:'Criado em',updated_at:'Atualizado em',priority:'Prioridade',owner_id:'Responsável (ID)',website:'Site',document:'CPF/CNPJ',notes:'Observações'})[key]||key}</dt><dd>{labels[value]||val(value)}</dd></div>)}</dl>{module==='leads'&&<>
        <h3>Atribuição</h3>{['first_touch','last_touch'].map(key=><div key={key}><b>{key==='first_touch'?'Primeiro contato':'Último contato'}</b><pre>{JSON.stringify(JSON.parse(record[key]||'{}'),null,2)}</pre></div>)}
        {record.status==='WON'&&canWrite&&<button disabled={busy} onClick={async()=>{if(!window.confirm('Converter este lead ganho em cliente?'))return;const result=await mutate('leads/'+record.id+'/convert',{});if(result)window.location.assign('/admin/clientes/'+result.id);}}>Converter em cliente</button>}
        {detail.client&&<a href={'/admin/clientes/'+detail.client.id}>Abrir cliente relacionado</a>}
        <h3>Notas</h3>{canWrite&&<form className={styles.form} onSubmit={async e=>{e.preventDefault();const form=e.currentTarget;if(await mutate('leads/'+record.id+'/notes',{body:new FormData(form).get('body')}))form.reset();}}><label>Nova observação<textarea name="body" required maxLength={4000}/></label><button disabled={busy}>Adicionar nota</button></form>}
        <Table columns={['Data','Autor','Nota']} rows={detail.notes.map(n=>[date(n.created_at),n.author,n.body])}/><h3>Histórico de status</h3><Table columns={['Data','De','Para','Responsável']} rows={detail.history.map(h=>[date(h.created_at),labels[h.old_status]||'—',labels[h.new_status],h.actor||'Formulário público'])}/><h3>Submissões</h3><Table columns={['Data','Mensagem','E-mail']} rows={detail.submissions.map(s=>[date(s.created_at),s.message,labels[s.email_status]])}/>
      </>}{module==='clientes'&&detail.lead&&<><h3>Origem e relacionamento</h3><a href={'/admin/leads/'+record.lead_id}>Abrir lead original</a><p>{detail.lead.record.interest}</p><h3>Histórico de contato</h3><Table columns={['Data','Nota']} rows={detail.lead.notes.map(n=>[date(n.created_at),n.body])}/></>}{module==='campanhas'&&<><label>URL com UTM<input readOnly value={campaignUrl(record)}/></label><button onClick={()=>navigator.clipboard.writeText(campaignUrl(record)).then(()=>setMessage('URL copiada.')).catch(()=>setError('Não foi possível copiar. Selecione a URL acima.'))}>Copiar URL</button></>}</section>}
      {editing&&<section className={styles.panel}><h2>{editing.id?'Editar':'Novo'} {names[module]}</h2><form className={styles.form} onSubmit={save} key={editing.id||'new'}>
        {module==='usuarios'?<>{field('email','E-mail','email',true,254)}{field('password',editing.id?'Nova senha (deixe vazio para manter)':'Senha (mínimo 12 caracteres)','password',!editing.id,256)}<label>Role<select name="role" defaultValue={editing.role||'VIEWER'}>{['OWNER','ADMIN','MARKETING','SALES','VIEWER'].map(r=><option key={r}>{r}</option>)}</select></label><label className={styles.check}><input type="checkbox" name="active" defaultChecked={Boolean(editing.active)}/> Conta ativa</label></>:<>
          {field('name','Nome','text',true,module==='campanhas'?150:100)}
          {module==='campanhas'?<>{area('description','Descrição',2000)}{field('channel','Canal')}{field('source','UTM source','text',true,100)}{field('medium','UTM medium','text',true,100)}{field('slug','Slug da campanha','text',true,100)}{field('landing_page','Página do site (ex.: /planos)','text',true,300)}{field('starts_at','Início','date')}{field('ends_at','Fim','date')}{area('notes','Observações')}</>:<>{field('company','Empresa')}{field('email','E-mail','email',true,254)}{field('phone','Telefone','tel',false,24)}{field('whatsapp','WhatsApp','tel',false,24)}{module==='leads'?<>{field('interest','Serviço de interesse','text',false,100)}{area('message','Mensagem')}<label>Responsável<select name="owner_id" defaultValue={editing.owner_id||''}><option value="">Sem responsável</option>{(data.owners||[]).map(o=><option key={o.id} value={o.id}>{o.email}</option>)}</select></label><label>Prioridade<select name="priority" defaultValue={editing.priority||'NORMAL'}>{['LOW','NORMAL','HIGH'].map(s=><option key={s} value={s}>{labels[s]}</option>)}</select></label></>:<>{field('website','Site','url',false,500)}{field('document','CPF/CNPJ (opcional)','text',false,24)}{area('notes','Observações')}</>}</>}
          <label>Status<select name="status" defaultValue={editing.status||statuses[module][0]}>{statuses[module].map(s=><option key={s} value={s}>{labels[s]}</option>)}</select></label>
        </>}
        <div className={styles.actions}><button disabled={busy}>{busy?'Salvando…':'Salvar'}</button><button type="button" onClick={()=>setEditing(null)}>Cancelar</button></div>
      </form></section>}
      {data.rows&&!recordId&&<>
        {['leads','clientes'].includes(module)&&<Table columns={['Nome','Empresa','Contato','Status','Criado em','Ações']} rows={rows.map(r=>[<a href={'/admin/'+module+'/'+r.id}>{r.name}</a>,r.company||'—',r.email,labels[r.status],date(r.created_at),canWrite?<button onClick={()=>setEditing(r)}>Editar</button>:'—'])}/>}
        {module==='campanhas'&&<Table columns={['Campanha','Status','Canal','Período','Visitas atribuídas','Leads','Ganhos','Leads / visitas','Ações']} rows={rows.map(r=>[<a href={'/admin/campanhas/'+r.id}>{r.name}</a>,labels[r.status],r.channel,r.starts_at+' — '+r.ends_at,r.visits,r.leads,r.conversions,r.visits?(r.leads/r.visits*100).toFixed(1)+'%':'—',<button onClick={()=>setEditing(r)}>Editar</button>])}/>}
        {module==='formularios'&&<Table columns={['Data','Lead','E-mail','Mensagem','Notificação']} rows={rows.map(r=>[date(r.created_at),<a href={'/admin/leads/'+r.lead_id}>{r.name}</a>,r.email,r.message,labels[r.email_status]])}/>}
        {module==='usuarios'&&<section className={styles.panel}><header className={styles.sectionHeading}><div><h2>Equipe e permissões</h2><p>{data.total} contas administrativas</p></div></header><Table columns={['Usuário','Perfil','Status','Último acesso','Ações']} rows={rows.map(r=>[<strong>{r.email}</strong>,<Badge>{({OWNER:'Proprietário',ADMIN:'Administrador',MARKETING:'Marketing',SALES:'Comercial',VIEWER:'Leitura'})[r.role]||r.role}</Badge>,<Badge tone={r.active?'positive':'neutral'}>{r.active?'Ativo':'Inativo'}</Badge>,r.last_login?date(r.last_login):'Sem registro',<button onClick={()=>setEditing(r)}>Editar</button>])}/></section>}
        {module==='auditoria'&&<section className={styles.panel}><header className={styles.sectionHeading}><div><h2>Atividade administrativa</h2><p>{data.total} registros encontrados</p></div></header><Table columns={['Data','Usuário','Ação','Entidade','Registro']} rows={rows.map(r=>[date(r.created_at),r.actor||'Sistema',<Badge>{({login:'Entrada',logout:'Saída',create:'Criação',update:'Edição',settings:'Configuração',convert:'Conversão',note:'Nota'})[r.action]||userAuditActions[r.action]||r.action}</Badge>,r.entity,<span className={styles.recordId} title={r.entity_id}>{r.entity_id}</span>])}/></section>}
        <div className={styles.actions}><button disabled={filters.page<=1} onClick={()=>setFilters({...filters,page:filters.page-1})}>Anterior</button><span>Página {data.page} · {data.total} registros</span><button disabled={data.page*data.limit>=data.total} onClick={()=>setFilters({...filters,page:filters.page+1})}>Próxima</button></div>
      </>}
    </>}
  </>;
}
