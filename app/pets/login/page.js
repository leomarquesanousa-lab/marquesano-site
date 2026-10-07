import {redirect} from 'next/navigation';
import {currentUser} from '../lib/auth.mjs';
import AuthForm from '../components/AuthForm';
import styles from '../components/auth-form.module.css';
export const dynamic='force-dynamic';
export const metadata={title:'Entrar em Pets',robots:{index:false,follow:false}};
export default async function Page({searchParams}){
 if(await currentUser())redirect('/pets/minha-conta');
 const search=await searchParams;
 return <div className={styles.page}><AuthForm next={search.next}/></div>;
}
