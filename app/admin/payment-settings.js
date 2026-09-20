'use client';
import { useEffect, useState } from 'react';
import styles from './admin.module.css';
import BillingHistory from './billing-history.js';

function PlanEditor({ plan, configured, api, onChange }) {
  const [values,setValues]=useState({...plan,price:plan.monthly_price_cents==null?'':(plan.monthly_price_cents/100).toFixed(2)});
  const [busy,setBusy]=useState(false),[dirty,setDirty]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  function change(key,value){setValues(v=>({...v,[key]:value}));setDirty(true);setMessage('');}
  async function run(sync) {
    setBusy(true);setError('');setMessage('');
    try {
      if(!sync&&values.price!==''&&!/^\d+(\.\d{1,2})?$/.test(values.price))throw Error('Informe um preço com até duas casas decimais.');
      const result=await api('configuracoes/pagamentos/'+plan.id+(sync?'/sync':''),{method:sync?'POST':'PATCH',body:JSON.stringify(sync?{}:{name:values.name,description:values.description,monthly_price_cents:values.price===''?null:Math.round(Number(values.price)*100),cycles:Number(values.cycles),active:values.active,mercadopago_plan_id:values.mercadopago_plan_id||'',revision:plan.revision})});
      onChange(result.plan);setValues({...result.plan,price:result.plan.monthly_price_cents==null?'':(result.plan.monthly_price_cents/100).toFixed(2)});setDirty(false);setMessage(sync?'Plano sincronizado.':'Plano salvo. Sincronize para disponibilizar a contratação.');
    } catch(e){setError(e.message);}finally{setBusy(false);}
  }
  return <section className={styles.panel}><h3>{plan.name}</h3><p className={styles.help}>Código: {plan.id} · {plan.active?'Ativo':'Inativo'} · Sincronização: {({pending:'Pendente',synced:'Sincronizado',error:'Erro',unknown:'Requer conferência no Mercado Pago',syncing:'Em andamento'})[plan.sync_state]}</p>
    <form className={styles.form} onSubmit={e=>{e.preventDefault();run(false);}}>
      <label>Nome<input value={values.name} maxLength={80} required disabled={busy} onChange={e=>change('name',e.target.value)}/></label>
      <label>Descrição<textarea value={values.description} maxLength={500} required disabled={busy} onChange={e=>change('description',e.target.value)}/></label>
      <label>Preço mensal (R$)<input type="number" min="0.01" max="1000000" step="0.01" placeholder="A confirmar" value={values.price} disabled={busy} onChange={e=>change('price',e.target.value)}/></label>
      <label>Duração: número de cobranças mensais<input type="number" min="1" max="1200" step="1" required value={values.cycles} disabled={busy} onChange={e=>change('cycles',e.target.value)}/></label>
      <label>mercadopago_plan_id<input value={values.mercadopago_plan_id||''} maxLength={100} readOnly={Boolean(plan.mercadopago_plan_id)} disabled={busy} placeholder="Preenchido ao sincronizar" onChange={e=>change('mercadopago_plan_id',e.target.value)}/></label>
      <label className={styles.check}><input type="checkbox" checked={values.active} disabled={busy} onChange={e=>change('active',e.target.checked)}/> Plano ativo</label>
      <div className={styles.actions}><button disabled={busy||!dirty}>Salvar plano</button><button type="button" disabled={busy||dirty||!configured||plan.monthly_price_cents==null} onClick={()=>run(true)}>{busy?'Aguarde…':'Sincronizar com Mercado Pago'}</button></div>
    </form>
    {dirty&&<p className={styles.help}>Salve as alterações antes de sincronizar.</p>}
    {error&&<p role="alert" className={styles.error}>{error} <button type="button" onClick={()=>window.location.reload()}>Recarregar dados</button></p>}
    {message&&<p role="status" className={styles.success}>{message}</p>}
  </section>;
}

export default function PaymentSettings({ api }) {
  const [data,setData]=useState(null),[error,setError]=useState('');
  useEffect(()=>{const controller=new AbortController();api('configuracoes/pagamentos',{signal:controller.signal}).then(setData).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>controller.abort();},[api]);
  return <section id="pagamentos"><div className={styles.sectionHeading}><div><h2>Pagamentos · Mercado Pago</h2><p>Três planos independentes, com valores e ciclos definidos aqui.</p></div></div>
    <BillingHistory api={api}/>
    {error&&<p role="alert" className={styles.error}>{error}</p>}
    {!data&&!error&&<p>Carregando planos…</p>}
    {data&&<><p>Credencial do servidor: {data.configured?'Configurada':'Não configurada — defina MERCADOPAGO_ACCESS_TOKEN.'}</p><p className={styles.help}>Salvar altera o catálogo. Sincronizar cria ou atualiza somente o plano escolhido no Mercado Pago. Mudanças no plano remoto podem afetar assinaturas vinculadas; confira as condições antes de sincronizar. Inativar bloqueia novas contratações no site; sincronize para atualizar também o provedor.</p><div className={styles.integrationGrid}>{data.plans.map(plan=><PlanEditor key={plan.id} plan={plan} configured={data.configured} api={api} onChange={updated=>setData(current=>({...current,plans:current.plans.map(p=>p.id===updated.id?updated:p)}))}/>)}</div></>}
  </section>;
}
