'use client';
import { useEffect, useState } from 'react';
import styles from './admin.module.css';
import { Badge } from './visuals.js';

const feedback={CONNECTED:'Meta conectada com sucesso. Selecione uma conta de anúncios.',NO_ACCOUNTS:'Meta conectada, mas nenhuma conta de anúncios foi encontrada.',OAUTH_CANCELLED:'OAuth cancelado. A conexão anterior foi preservada.',PERMISSION_DENIED:'Permissão negada. Autorize a leitura de anúncios.',STATE_INVALID:'A autorização expirou ou não corresponde à sessão. Conecte novamente.',TOKEN_INVALID:'Token inválido ou expirado. Conecte novamente.',MARKETING_PERMISSION:'Marketing API sem permissão. Confira ads_read e o acesso ao App e à conta.',CONNECTION_CHANGED:'A conexão mudou. Atualize a página e tente novamente.',PROVIDER_ERROR:'Não foi possível concluir a autorização com a Meta. Tente novamente.'};
export default function MetaSettings({ meta:initial, api }) {
  const [meta,setMeta]=useState(initial),[accounts,setAccounts]=useState([]),[businesses,setBusinesses]=useState([]),[selected,setSelected]=useState(initial.adAccountId||'');
  const [busy,setBusy]=useState(''),[message,setMessage]=useState(''),[error,setError]=useState(''),[loaded,setLoaded]=useState(false),[truncated,setTruncated]=useState(false);
  useEffect(()=>{const url=new URL(window.location.href),code=url.searchParams.get('meta');if(code){setMessage(feedback[code]||'Confira o estado da conexão abaixo.');url.searchParams.delete('meta');window.history.replaceState(null,'',url.pathname+url.search+url.hash);}},[]);
  useEffect(()=>{
    let active=true;
    setLoaded(false);
    if(!meta.accountConnected){setAccounts([]);setBusinesses([]);return;}
    api('meta/ad-accounts').then(result=>{if(active){setAccounts(result.accounts);setBusinesses(result.businesses);setTruncated(result.truncated);setLoaded(true);}}).catch(e=>{if(active)setError(e.message);});
    return()=>{active=false;};
  },[meta.accountConnected,api]);
  async function action(name,body={}) {
    if(name==='disconnect'&&!window.confirm('Desconectar a Meta deste painel? O token armazenado será removido.'))return;
    setBusy(name);setMessage('');setError('');
    try {
      const result=await api('meta/'+name,{method:'POST',body:JSON.stringify(body)});
      if(result.meta){setMeta(result.meta);setSelected(result.meta.adAccountId||'');}
      if(result.accounts){setAccounts(result.accounts);setBusinesses(result.businesses);setLoaded(true);setTruncated(result.truncated);}
      setMessage(result.message||(name==='select-account'?'Conta de anúncios selecionada.':'Operação concluída.'));
    }catch(e){setError(e.message);try{const state=await api('meta/status');setMeta(state);setSelected(state.adAccountId||'');}catch{}}
    finally{setBusy('');}
  }
  return <section className={styles.panel} id="meta"><header className={styles.sectionHeading}><div><h2>Meta</h2><p>Facebook e Instagram Ads · somente leitura</p></div><Badge tone={meta.accountConnected?'positive':'neutral'}>{meta.oauthStatus}</Badge></header>
    <dl className={styles.integrationFacts}><div><dt>App configurado</dt><dd>{meta.appConfigured?'Sim':'Não'}</dd></div><div><dt>App ID</dt><dd>{meta.appId||'Não configurado'}</dd></div><div><dt>App Secret</dt><dd>{meta.appSecretConfigured?'Configurado no servidor':'Não configurado'}</dd></div><div><dt>OAuth</dt><dd>{meta.oauthStatus}</dd></div><div><dt>Conta Meta conectada</dt><dd>{meta.profile?`${meta.profile.name} (${meta.profile.id})`:'Não conectada'}</dd></div><div><dt>Conta de anúncios</dt><dd>{meta.selectedAccount?.name||'Não selecionada'}</dd></div></dl>
    {meta.message&&<p className={styles.notice}>{meta.message}</p>}
    <div className={styles.actions}>{meta.oauthReady?<a className={styles.primaryLink} href="/api/admin/meta/connect">{meta.accountConnected?'Reconectar Meta':'Conectar Meta'}</a>:<button disabled>Conectar Meta</button>}
      {meta.accountConnected&&<><button disabled={Boolean(busy)} onClick={()=>action('test')}>{busy==='test'?'Testando…':'Testar conexão'}</button></>}{(meta.accountConnected||meta.expiresAt||meta.hasStoredConnection)&&<button disabled={Boolean(busy)} onClick={()=>action('disconnect')}>Desconectar</button>}
    </div>
    {meta.accountConnected&&<form className={styles.form} onSubmit={e=>{e.preventDefault();action('select-account',{accountId:selected});}}><label>Conta de anúncios<select value={selected} disabled={Boolean(busy)||!loaded} onChange={e=>setSelected(e.target.value)}><option value="">Selecione uma conta</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name} · {a.id} · {a.currency}</option>)}</select></label><div className={styles.actions}><button disabled={!selected||Boolean(busy)||!loaded}>{busy==='select-account'?'Salvando…':'Selecionar conta'}</button></div>{loaded&&!accounts.length&&<p role="status">Nenhuma conta de anúncios encontrada.</p>}{truncated&&<p className={styles.help}>Lista parcial: há mais contas na Meta do que o limite desta consulta.</p>}
      {meta.selectedAccount&&<p className={styles.help}>{meta.selectedAccount.currency} · {meta.selectedAccount.timezone} · Status Meta: {meta.selectedAccount.status}</p>}
      {businesses.length>0&&<p className={styles.help}>Negócios associados às contas: {businesses.map(b=>b.name).join(', ')}</p>}
    </form>}
    {message&&<p role="status" className={styles.notice}>{message}</p>}{error&&<p role="alert" className={styles.error}>{error}</p>}
  </section>;
}
