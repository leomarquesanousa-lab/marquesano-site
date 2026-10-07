'use client';
import Link from 'next/link';
import PetLogo from './PetLogo';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import styles from './auth-form.module.css';
export default function AuthForm({register=false,next='/pets/minha-conta'}){
 const router=useRouter(),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(event){
  event.preventDefault();setBusy(true);setError('');const fields=new FormData(event.currentTarget);
  try{
   const response=await fetch('/api/portal/'+(register?'register':'login'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:fields.get('name'),email:fields.get('email'),password:fields.get('password'),privacy:fields.get('privacy')==='on'})});
   const result=await response.json();if(!response.ok)throw Error(result.error);
   router.replace(typeof next==='string'&&next.startsWith('/pets/')&&!next.includes('\\')?next:'/pets/minha-conta');router.refresh();
  }catch(error){setError(error.message||'Não foi possível entrar.');}finally{setBusy(false);}
 }
 return <form className={styles.card} onSubmit={submit} aria-labelledby="pet-auth-title" aria-busy={busy}>
  <div className={styles.brand}><PetLogo context="form"/></div>
  <div className={styles.intro}><h1 id="pet-auth-title">{register?'Faça parte do Pet Find':'Que bom ter você por aqui'}</h1><p>{register?'Crie sua conta para publicar e cuidar dos seus anúncios.':'Entre na sua conta e acompanhe as histórias que você ajuda a transformar.'}</p></div>
  <div className={styles.fields}>
   {register&&<label className={styles.field} htmlFor="pet-auth-name">Seu nome<input className={styles.input} id="pet-auth-name" name="name" required minLength={2} maxLength={100} autoComplete="name"/></label>}
   <label className={styles.field} htmlFor="pet-auth-email">E-mail<input className={styles.input} id="pet-auth-email" name="email" type="email" required maxLength={254} autoComplete="email"/></label>
   <label className={styles.field} htmlFor="pet-auth-password">Senha<input className={styles.input} id="pet-auth-password" name="password" type="password" required minLength={12} maxLength={256} autoComplete={register?'new-password':'current-password'} aria-describedby="pet-auth-password-hint"/><span className={styles.hint} id="pet-auth-password-hint">Use uma senha com pelo menos 12 caracteres.</span></label>
   {register&&<label className={styles.terms} htmlFor="pet-auth-privacy"><input className={styles.checkbox} id="pet-auth-privacy" name="privacy" type="checkbox" required/><span>Li e aceito os <Link href="/pets/termos">termos de uso</Link> e a <Link href="/pets/privacidade">política de privacidade</Link>.</span></label>}
  </div>
  {error&&<div className={styles.error} role="alert"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 3h.01"/></svg><span>{error}</span></div>}
  <button className={styles.submit} disabled={busy}>{busy?'Aguarde…':register?'Criar minha conta':'Entrar'}</button>
  <p className={styles.switch}>{register?<>Já tem uma conta? <Link href="/pets/login">Entrar</Link></>:<>Ainda não tem conta? <Link href="/pets/cadastro">Cadastre-se</Link></>}</p>
  <p className={styles.admin}><Link href="/admin/login">Acesso administrativo Marquesano</Link></p>
 </form>;
}
