import {redirect} from 'next/navigation';
import {currentUser} from '../lib/auth.mjs';
import AuthForm from '../components/AuthForm';
import styles from '../components/auth-form.module.css';
export const dynamic='force-dynamic';
export const metadata={title:'Criar conta Pets',robots:{index:false,follow:false}};
export default async function Page(){
 if(await currentUser())redirect('/pets/minha-conta');
 return <div className={styles.page}><AuthForm register/></div>;
}
