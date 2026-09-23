'use client';
import { useState } from 'react';
import styles from './admin.module.css';
import IntegrationStatus from './integration-status.js';
import MetaSettings from './meta-settings.js';
import PaymentSettings from './payment-settings.js';

function IntegrationForm({ title, fields, settings, integration, provider, api, credentialsPresent }) {
  const [saved, setSaved]=useState(settings);
  const [values, setValues]=useState(settings);
  const [result, setResult]=useState(integration?.result || null);
  const [busy, setBusy]=useState('');
  const [message, setMessage]=useState('');
  const [error, setError]=useState('');
  const dirty=fields.some(([key])=>values[key]!==saved[key]);
  const configured=provider ? credentialsPresent && Boolean(saved[provider==='ga4' ? 'GA4_PROPERTY_ID' : 'GSC_SITE_URL']) : Boolean(saved.GTM_CONTAINER_ID);

  async function save(event) {
    event.preventDefault();setBusy('save');setError('');setMessage('');
    try {
      await api('configuracoes',{method:'PATCH',body:JSON.stringify(Object.fromEntries(fields.map(([key])=>[key,values[key]])))});
      setSaved(values);setResult(null);setMessage('Configurações salvas.');
    } catch(e) {setError(e.message);} finally {setBusy('');}
  }
  async function test() {
    setBusy('test');setError('');setMessage('');
    try {setResult(await api('configuracoes/'+provider+'/test',{method:'POST',body:'{}'}));}
    catch(e) {setResult({status:'Erro',message:e.message});}
    finally {setBusy('');}
  }
  return <section className={styles.panel}><h2>{title}</h2>
    {provider ? <><IntegrationStatus integration={{...integration,status:configured ? 'Configurado' : 'Não configurado'}} result={result}/>
      {!result && configured && <p className={styles.help}>Configuração presente. Teste a conexão para confirmar o acesso.</p>}</> : <p>Status: {configured ? 'Configurado' : 'Não configurado'} · Opcional</p>}
    {provider==='ga4' && <p>Service Account: {credentialsPresent ? 'configurada' : 'não configurada'}</p>}
    <form className={styles.form} onSubmit={save}>
      {fields.map(([key,label,placeholder])=><label key={key} htmlFor={key}>{label}<input id={key} name={key} value={values[key] || ''} placeholder={placeholder} maxLength={300} disabled={Boolean(busy)} onChange={e=>{setValues({...values,[key]:e.target.value});setMessage('');}}/></label>)}
      {!provider && <p className={styles.help}>Com GTM configurado, a tag GA4 direta é desativada para evitar duplicidade. Publique as tags no contêiner do Google.</p>}
      <div className={styles.actions}><button disabled={Boolean(busy)}>{busy==='save' ? 'Salvando…' : 'Salvar'}</button>
        {provider && <button type="button" disabled={Boolean(busy)||dirty} onClick={test}>{busy==='test' ? 'Testando…' : 'Testar conexão'}</button>}
      </div>
      {provider && dirty && <p className={styles.help}>Salve as alterações antes de testar.</p>}
    </form>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {message && <p role="status" className={styles.success}>{message}</p>}
    {result?.message && <p role={result.ok ? 'status' : 'alert'} className={result.ok ? styles.success : styles.error}>{result.message}</p>}
  </section>;
}

function LocalCollection({ settings, api }) {
  const [enabled,setEnabled]=useState(settings.TRACKING_ENABLED==='true');
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
  async function save(event) {
    event.preventDefault();setBusy(true);setError('');setMessage('');
    try {await api('configuracoes',{method:'PATCH',body:JSON.stringify({TRACKING_ENABLED:String(enabled)})});setMessage('Coleta salva.');}
    catch(e) {setError(e.message);} finally {setBusy(false);}
  }
  return <section className={styles.panel}><h2>Coleta local</h2><form className={styles.form} onSubmit={save}>
    <label className={styles.check}><input type="checkbox" name="TRACKING_ENABLED" checked={enabled} disabled={busy} onChange={e=>{setEnabled(e.target.checked);setMessage('');}}/> Habilitar coleta (TRACKING_ENABLED)</label>
    <p className={styles.help}>Registra visitas, eventos e origens no painel. Também habilita as tags Google configuradas, sem enviar dados dos formulários.</p>
    <div className={styles.actions}><button disabled={busy}>{busy ? 'Salvando…' : 'Salvar'}</button></div>
  </form>{message && <p role="status" className={styles.success}>{message}</p>}{error && <p role="alert" className={styles.error}>{error}</p>}</section>;
}

export default function SettingsIntegrations({ data, user, api }) {
  const shared={settings:data.settings,api,credentialsPresent:data.integrations.credentialsPresent};
  return <><PaymentSettings api={api}/><div className={styles.sectionHeading}><div><h2>Integrações</h2><p>Conexões e coleta do site, em um só lugar.</p></div></div><div className={styles.integrationGrid}>
    <IntegrationForm {...shared} title="Google Analytics" provider="ga4" integration={data.integrations.ga4} fields={[
      ['GA4_MEASUREMENT_ID','GA4 Measurement ID','G-…'],['GA4_PROPERTY_ID','GA4 Property ID','ID numérico']
    ]}/>
    <IntegrationForm {...shared} title="Google Search Console" provider="gsc" integration={data.integrations.gsc} fields={[
      ['GSC_SITE_URL','GSC_SITE_URL','sc-domain:marquesano.com.br ou https://marquesano.com.br/']
    ]}/>
    <MetaSettings meta={data.meta} api={api}/>
    <IntegrationForm {...shared} title="Google Tag Manager" fields={[
      ['GTM_CONTAINER_ID','GTM_CONTAINER_ID (opcional)','GTM-…']
    ]}/>
    <LocalCollection settings={data.settings} api={api}/>
    <section className={styles.panel}><h2>Credenciais do servidor</h2>
      <p>Service Account: {data.integrations.credentialsPresent ? 'configurada' : 'não configurada'}</p>
      <p className={styles.help}>GOOGLE_CLIENT_EMAIL (ou GOOGLE_SERVICE_ACCOUNT_EMAIL) e GOOGLE_PRIVATE_KEY ficam somente no .env do servidor. A conta deve ter acesso às propriedades Google.</p>
    </section>
    </div>
  </>;
}
