import {redirect} from 'next/navigation';
export const metadata={title:'Meus anúncios',robots:{index:false,follow:false}};
export default function Page(){redirect('/pets/minha-conta');}
