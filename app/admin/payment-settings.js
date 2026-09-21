'use client';
import { useEffect, useRef, useState } from 'react';
import { checkoutPlans } from '../config/checkout-plans.mjs';
import styles from './admin.module.css';
import BillingHistory from './billing-history.js';

const planName = plan => Object.values(checkoutPlans).find(p=>p.storedId===plan.id)?.name || plan.name;

function PlanEditor({ plan, configured, api, onChange, locked, onDirty }) {
  const [values,setValues]=useState({...plan,price:plan.monthly_price_cents==null?'':(plan.monthly_price_cents/100).toFixed(2)});
  const [busy,setBusy]=useState(false),[dirty,setDirty]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  function change(key,value){setValues(v=>({...v,[key]:value}));setDirty(true);onDirty(plan.id,true);setMessage('');}
  async function run(sync) {
    setBusy(true);setError('');setMessage('');
    try {
      if(!sync&&values.price!==''&&!/^\d+(\.\d{1,2})?$/.test(values.price))throw Error('Informe um preço com até duas casas decimais.');
      const result=await api('configuracoes/pagamentos/'+plan.id+(sync?'/sync':''),{method:sync?'POST':'PATCH',body:JSON.stringify(sync?{}:{name:values.name,description:values.description,monthly_price_cents:values.price===''?null:Math.round(Number(values.price)*100),cycles:Number(values.cycles),active:values.active,mercadopago_plan_id:values.mercadopago_plan_id||'',revision:plan.revision})});
      onChange(result.plan);setValues({...result.plan,price:result.plan.monthly_price_cents==null?'':(result.plan.monthly_price_cents/100).toFixed(2)});setDirty(false);onDirty(plan.id,false);setMessage(sync?'Plano sincronizado.':'Plano salvo. Sincronize para disponibilizar a contratação.');
    } catch(e){setError(e.message);}finally{setBusy(false);}
  }
  return <section className={styles.panel}><h3>{planName(plan)}</h3><p className={styles.help}>{plan.active?'Ativo':'Inativo'} · Sincronização: {({pending:'Pendente',synced:'Sincronizado',error:'Erro',unknown:'Requer conferência no Mercado Pago',syncing:'Em andamento'})[plan.sync_state]}</p>
    <form className={styles.form} onSubmit={e=>{e.preventDefault();run(false);}}>
      <fieldset disabled={locked||busy} style={{border:0,padding:0,margin:0,minWidth:0,display:'grid',gap:14}}>
      <label>Nome<input value={values.name} maxLength={80} required disabled={busy} onChange={e=>change('name',e.target.value)}/></label>
      <label>Descrição<textarea value={values.description} maxLength={500} required disabled={busy} onChange={e=>change('description',e.target.value)}/></label>
      <label>Preço mensal (R$)<input type="number" min="0.01" max="1000000" step="0.01" placeholder="A confirmar" value={values.price} disabled={busy} onChange={e=>change('price',e.target.value)}/></label>
      <label>Duração: número de cobranças mensais<input type="number" min="1" max="1200" step="1" required value={values.cycles} disabled={busy} onChange={e=>change('cycles',e.target.value)}/></label>
      <p className={styles.help}>ID Mercado Pago: {plan.mercadopago_plan_id||'Será preenchido automaticamente ao sincronizar.'}</p>
      <label className={styles.check}><input type="checkbox" checked={values.active} disabled={busy} onChange={e=>change('active',e.target.checked)}/> Plano ativo</label>
      <div className={styles.actions}><button disabled={busy||!dirty}>Salvar plano</button><button type="button" disabled={busy||dirty||!configured||plan.monthly_price_cents==null} onClick={()=>run(true)}>{busy?'Aguarde…':'Sincronizar com Mercado Pago'}</button></div>
      </fieldset>
    </form>
    {dirty&&<p className={styles.help}>Salve as alterações antes de sincronizar.</p>}
    {error&&<p role="alert" className={styles.error}>{error} <button type="button" onClick={()=>window.location.reload()}>Recarregar dados</button></p>}
    {message&&<p role="status" className={styles.success}>{message}</p>}
  </section>;
}

export default function PaymentSettings({ api }) {
  const [data,setData]=useState(null),[error,setError]=useState('');
  const [connection,setConnection]=useState(null),[busy,setBusy]=useState(''),[results,setResults]=useState([]),[dirty,setDirty]=useState({});
  const running=useRef(false);
  const onDirty=(id,value)=>setDirty(current=>({...current,[id]:value}));
  const update=updated=>setData(current=>({...current,plans:current.plans.map(p=>p.id===updated.id?updated:p)}));
  async function testConnection() {
    if(running.current)return;
    running.current=true;setBusy('test');setError('');
    try {const result=await api('configuracoes/pagamentos/test-connection',{method:'POST',body:'{}'});setConnection(result.connection);setData(current=>({...current,configuration:result.configuration,configured:result.configuration.access_token}));}
    catch(e){setConnection({status:'error',message:e.message});}
    finally{running.current=false;setBusy('');}
  }
  async function syncAll() {
    if(running.current||Object.values(dirty).some(Boolean))return;
    running.current=true;setBusy('sync');setResults([]);setError('');
    try {
      for(const plan of data.plans) {
        setResults(current=>[...current,{id:plan.id,name:planName(plan),message:'Sincronizando…'}]);
        let message;
        try {const result=await api('configuracoes/pagamentos/'+plan.id+'/sync',{method:'POST',body:'{}'});update(result.plan);message='Plano sincronizado com sucesso';}
        catch(e){message=e.message;}
        setResults(current=>current.map(result=>result.id===plan.id?{...result,message}:result));
      }
      try {const refreshed=await api('configuracoes/pagamentos');setData(refreshed);}
      catch(e){setError('A sincronização terminou, mas não foi possível atualizar os dados: '+e.message);}
    } finally {running.current=false;setBusy('');}
  }
  useEffect(()=>{const controller=new AbortController();api('configuracoes/pagamentos',{signal:controller.signal}).then(setData).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>controller.abort();},[api]);
  return <section id="pagamentos"><div className={styles.sectionHeading}><div><h2>Pagamentos · Mercado Pago</h2><p>Três planos independentes, com valores e ciclos definidos aqui.</p></div></div>
    <BillingHistory api={api}/>
    {error&&<p role="alert" className={styles.error}>{error}</p>}
    {!data&&!error&&<p>Carregando planos…</p>}
    {data&&<>
      <section className={styles.panel}>
        <h3>Conexão Mercado Pago</h3>
        <p>Access Token: {data.configuration.access_token?'Configurado':'Não configurado'}</p>
        <p>Public Key: {data.configuration.public_key?'Configurada':'Não configurada'}</p>
        <p>Webhook Secret: {data.configuration.webhook_secret?'Configurado':'Não configurado'}</p>
        <p>Webhook URL: {data.configuration.webhook_url?'Configurada':'Não configurada'}</p>
        {data.configuration.webhook_url&&<p>{data.configuration.webhook_url}</p>}
        <p className={styles.help}>A URL acima é a esperada pelo servidor. O cadastro no painel Mercado Pago não é verificado aqui.</p>
        <p>API Mercado Pago: {connection?({connected:'Conectada',error:'Erro',unconfigured:'Não configurada'})[connection.status]:data.configured?'Não testada':'Não configurada'}</p>
        <p className={styles.help}>Configure MERCADOPAGO_ACCESS_TOKEN, MERCADOPAGO_PUBLIC_KEY e MERCADOPAGO_WEBHOOK_SECRET no servidor. A Public Key não é necessária para testar a API ou sincronizar planos.</p>
        {data.configuration.configuration_error&&<p role="alert" className={styles.error}>{data.configuration.configuration_error}</p>}
        <div className={styles.actions}>
          <button type="button" disabled={Boolean(busy)} onClick={testConnection}>{busy==='test'?'Testando…':'Testar conexão'}</button>
          <button type="button" disabled={Boolean(busy)||!data.configured||Boolean(data.configuration.configuration_error)||Object.values(dirty).some(Boolean)} onClick={syncAll}>{busy==='sync'?'Sincronizando…':'Sincronizar planos'}</button>
        </div>
        {connection&&<p role={connection.status==='connected'?'status':'alert'}>{connection.message}</p>}
        {Object.values(dirty).some(Boolean)&&<p>Salve as alterações dos planos antes de sincronizar todos.</p>}
        <ul aria-live="polite">{results.map(result=><li key={result.id}><strong>{result.name}:</strong> {result.message}</li>)}</ul>
      </section>
      <p className={styles.help}>Defina e salve o preço e os ciclos de cada plano antes de sincronizar. Planos sem preço confirmado não serão criados. A sincronização reutiliza os IDs existentes e salva novos IDs automaticamente.</p>
      <div className={styles.integrationGrid}>{data.plans.map(plan=><PlanEditor key={plan.id+':'+plan.revision+':'+plan.sync_state} plan={plan} configured={data.configured&&!data.configuration.configuration_error} api={api} onChange={update} locked={Boolean(busy)} onDirty={onDirty}/>)}</div>
    </>}
  </section>;
}
