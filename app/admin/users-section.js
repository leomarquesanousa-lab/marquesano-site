'use client';
import { useEffect, useState } from 'react';
import styles from './admin.module.css';
import { Table } from './report-sections.js';
import { Badge, LoadingState } from './visuals.js';

const date=value=>value?new Date(value).toLocaleString('pt-BR'):'Não registrado';
export default function UsersSection({api,user}) {
  const [data,setData]=useState(null),[page,setPage]=useState(1),[version,setVersion]=useState(0),[editing,setEditing]=useState(null),[passwordUser,setPasswordUser]=useState(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{const controller=new AbortController();api('usuarios?page='+page,{signal:controller.signal}).then(setData).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>controller.abort();},[api,page,version]);
  const allowed=row=>!row.deleted_at&&(user.role==='OWNER'||row.role!=='OWNER');
  async function mutate(path,body,method='POST') {
    setBusy(true);setError('');setMessage('');
    try {
      const result=await api(path,{method,body:JSON.stringify(body)});
      setEditing(null);setPasswordUser(null);setVersion(v=>v+1);setMessage('Alteração salva.');
      if(result.session_invalidated)window.location.assign('/admin/login');
      return true;
    }catch(e){setError(e.message);return false;}finally{setBusy(false);}
  }
  function save(event) {
    event.preventDefault();const form=event.currentTarget,values=Object.fromEntries(new FormData(form));
    const body={name:values.name,email:values.email,role:values.role||editing.role,active:form.elements.active.checked};
    if(!editing.id){body.password=values.password;body.confirm_password=values.confirm_password;}
    void mutate('usuarios'+(editing.id?'/'+editing.id:''),body,editing.id?'PATCH':'POST');
  }
  const own=editing?.id===user.id;
  return <>
    <div className={styles.actions}><button disabled={busy} onClick={()=>{setEditing({name:'',email:'',role:'VIEWER',active:true});setPasswordUser(null);setError('');}}>Novo usuário</button></div>
    {error&&<p role="alert" className={styles.error}>{error}</p>}{message&&<p role="status" className={styles.success}>{message}</p>}
    {editing&&<section className={styles.panel}><h2>{editing.id?'Editar usuário':'Novo usuário'}</h2><form className={styles.form} onSubmit={save} key={editing.id||'new'}>
      <h3>Dados</h3><label>Nome<input name="name" defaultValue={editing.name||''} maxLength={100} autoComplete="name"/></label><label>E-mail<input name="email" type="email" required maxLength={254} defaultValue={editing.email} autoComplete="email"/></label>
      <h3>Permissões</h3><label>Role<select name="role" defaultValue={editing.role} disabled={own}>{(user.role==='OWNER'?['OWNER','ADMIN','MARKETING','SALES','VIEWER']:['ADMIN','MARKETING','SALES','VIEWER']).map(role=><option key={role}>{role}</option>)}</select></label>
      <label className={styles.check}><input type="checkbox" name="active" defaultChecked={Boolean(editing.active)} disabled={own}/> Conta ativa</label>
      <h3>Segurança</h3>{!editing.id?<><label>Senha<input name="password" type="password" required minLength={12} maxLength={256} autoComplete="new-password"/></label><label>Confirmar senha<input name="confirm_password" type="password" required minLength={12} maxLength={256} autoComplete="new-password"/></label><p className={styles.help}>Use pelo menos 12 caracteres.</p></>:<><p className={styles.help}>Editar dados não altera a senha. Alterar e-mail, role ou status encerra as sessões existentes.</p><button type="button" disabled={busy} onClick={()=>{setPasswordUser(editing);setEditing(null);}}>Alterar senha</button></>}
      <div className={styles.actions}><button disabled={busy}>{busy?'Salvando…':'Salvar'}</button><button type="button" disabled={busy} onClick={()=>setEditing(null)}>Cancelar</button></div>
    </form></section>}
    {passwordUser&&<section className={styles.panel}><h2>Alterar senha</h2><p>{passwordUser.email}</p><form className={styles.form} onSubmit={async e=>{e.preventDefault();const form=e.currentTarget,body=Object.fromEntries(new FormData(form));if(await mutate('usuarios/'+passwordUser.id+'/password',body))form.reset();}}>
      <label>Nova senha<input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={256}/></label><label>Confirmar nova senha<input name="confirm_password" type="password" autoComplete="new-password" required minLength={12} maxLength={256}/></label><p>Todas as sessões desse usuário serão encerradas.</p><div className={styles.actions}><button disabled={busy}>{busy?'Salvando…':'Salvar nova senha'}</button><button type="button" disabled={busy} onClick={()=>setPasswordUser(null)}>Cancelar</button></div>
    </form></section>}
    {!data?<LoadingState/>:<section className={styles.panel}><h2>Usuários</h2><Table columns={['Nome','E-mail','Role','Status','Criação','Último login','Ações']} rows={data.rows.map(row=>[row.name||'Não informado',row.email,<Badge>{row.role}</Badge>,<Badge tone={row.active?'positive':'neutral'}>{row.deleted_at?'Excluído':row.active?'Ativo':'Inativo'}</Badge>,date(row.created_at),date(row.last_login),allowed(row)?<div className={styles.actions}>
      <button disabled={busy} onClick={()=>{setEditing(row);setPasswordUser(null);setError('');}}>Editar</button><button disabled={busy} onClick={()=>{setPasswordUser(row);setEditing(null);setError('');}}>Alterar senha</button>
      <button disabled={busy||row.id===user.id} onClick={()=>{if(window.confirm(`${row.active?'Desativar':'Ativar'} este usuário?${row.active?' As sessões serão encerradas.':''}`))void mutate('usuarios/'+row.id+'/status',{active:!row.active});}}>{row.active?'Desativar':'Ativar'}</button>
      <button disabled={busy||row.id===user.id} onClick={()=>{if(window.confirm('Excluir este usuário? O acesso será bloqueado; o histórico e a auditoria serão preservados.'))void mutate('usuarios/'+row.id+'/delete',{});}}>Excluir</button>
    </div>:row.deleted_at?'Histórico preservado':'Gerenciado por OWNER'])}/><div className={styles.actions}><button disabled={page<=1||busy} onClick={()=>setPage(p=>p-1)}>Anterior</button><span>Página {data.page} · {data.total} usuários</span><button disabled={page*data.limit>=data.total||busy} onClick={()=>setPage(p=>p+1)}>Próxima</button></div></section>}
  </>;
}
